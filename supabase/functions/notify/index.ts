// Shared Living – "notify" Edge Function
// Sends web push notifications to housemates' phones.
//
// Secrets it needs (Edge Functions -> Secrets in Supabase):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  – from `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                        – mailto:you@example.com
//   NOTIFY_SECRET                        – any long random string; same one goes in 005_notifications.sql
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_SECRET = Deno.env.get('NOTIFY_SECRET') ?? '';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Note {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'Expected JSON' }, 400);
  }

  // "Send me a test" button in Settings: called by a logged-in user
  if (body.type === 'test') {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return reply({ error: 'Not logged in' }, 401);
    const result = await sendTo([data.user.id], {
      title: 'Notifications are on',
      body: "You'll hear when chores need your OK, get approved, or are due tonight.",
      tag: 'test',
    });
    return reply(result);
  }

  // Everything else comes from the database and must carry the shared secret
  if (!NOTIFY_SECRET || req.headers.get('x-notify-secret') !== NOTIFY_SECRET) {
    return reply({ error: 'Forbidden' }, 403);
  }

  try {
    switch (body.type) {
      case 'needs_ok':
        return reply(await needsOk(body.log_id));
      case 'reviewed':
        return reply(await reviewed(body.log_id));
      case 'reminder':
        return reply(await reminders(body.log_ids ?? []));
      default:
        return reply({ error: `Unknown type ${body.type}` }, 400);
    }
  } catch (e) {
    console.error(e);
    return reply({ error: String(e) }, 500);
  }
});

// ---------- Events ----------

async function loadLogs(ids: string[]) {
  const { data, error } = await db
    .from('chore_logs')
    .select(
      'id, house_id, user_id, status, credits_awarded, note, ' +
        'chore:chores(name, suggested_frequency), ' +
        'person:profiles!chore_logs_user_id_fkey(display_name), ' +
        'reviewer:profiles!chore_logs_reviewed_by_fkey(display_name)',
    )
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as any[];
}

/** A housemate finished a chore: tell everyone else it needs approving. */
async function needsOk(logId: string) {
  const [log] = await loadLogs([logId]);
  if (!log || log.status !== 'pending') return { skipped: true };

  const { data: members, error } = await db
    .from('house_members')
    .select('user_id')
    .eq('house_id', log.house_id)
    .neq('user_id', log.user_id);
  if (error) throw error;

  const who = log.person?.display_name ?? 'A housemate';
  const chore = log.chore?.name ?? 'a chore';
  return sendTo(
    (members ?? []).map((m) => m.user_id),
    {
      title: 'Needs your OK',
      body: `${who} did ${chore} (+${log.credits_awarded}). Tap to approve.` +
        (log.note ? ` “${log.note}”` : ''),
      tag: `ok-${log.id}`,
    },
  );
}

/** Your chore was approved or rejected. */
async function reviewed(logId: string) {
  const [log] = await loadLogs([logId]);
  if (!log || !['approved', 'rejected'].includes(log.status)) return { skipped: true };

  const chore = log.chore?.name ?? 'Your chore';
  const by = log.reviewer?.display_name ?? 'A housemate';
  const note: Note =
    log.status === 'approved'
      ? { title: `${chore} approved`, body: `+${log.credits_awarded} credits. ${by} gave it the OK.`, tag: `rev-${log.id}` }
      : { title: `${chore} wasn't approved`, body: `${by} rejected it, so it's back on the available list.`, tag: `rev-${log.id}` };
  return sendTo([log.user_id], note);
}

/** 7pm: chores still on someone's list that are due tonight. */
async function reminders(logIds: string[]) {
  if (!logIds.length) return { sent: 0 };
  const logs = (await loadLogs(logIds)).filter((l) => l.status === 'claimed');

  const byUser = new Map<string, string[]>();
  for (const l of logs) {
    const list = byUser.get(l.user_id) ?? [];
    list.push(l.chore?.name ?? 'A chore');
    byUser.set(l.user_id, list);
  }

  let sent = 0;
  for (const [userId, chores] of byUser) {
    const r = await sendTo([userId], {
      title: chores.length === 1 ? 'Still on your list' : `${chores.length} chores still on your list`,
      body: chores.length === 1
        ? `${chores[0]} is due by midnight.`
        : `${chores.join(', ')} are due by midnight.`,
      tag: 'reminder',
    });
    sent += r.sent;
  }
  return { sent };
}

// ---------- Sending ----------

async function sendTo(userIds: string[], note: Note) {
  const result = { sent: 0, removed: 0, failed: 0 };
  if (!userIds.length) return result;

  const { data: subs, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (error) throw error;

  // Format understood by Angular's service worker
  const payload = JSON.stringify({
    notification: {
      title: note.title,
      body: note.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: note.tag,
      renotify: !!note.tag,
      data: {
        onActionClick: {
          default: { operation: 'navigateLastFocusedOrOpen', url: note.url ?? '/home' },
        },
      },
    },
  });

  await Promise.all(
    (subs ?? []).map(async (s) => {
      const status = await pushOne(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      if (status >= 200 && status < 300) {
        result.sent++;
      } else if (status === 404 || status === 410) {
        // Phone unsubscribed or app removed: forget it
        await db.from('push_subscriptions').delete().eq('id', s.id);
        result.removed++;
      } else {
        result.failed++;
      }
    }),
  );
  return result;
}

/** Encrypts the message for one device and posts it to that device's push service. */
export async function pushOne(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
): Promise<number> {
  try {
    const req = webpush.generateRequestDetails(sub, payload, { TTL: 60 * 60 * 12, urgency: 'high' });
    const res = await fetch(req.endpoint, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: req.body as Uint8Array,
    });
    if (!res.ok) console.warn('push failed', res.status, await res.text());
    return res.status;
  } catch (e) {
    console.error('push error', e);
    return 0;
  }
}

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

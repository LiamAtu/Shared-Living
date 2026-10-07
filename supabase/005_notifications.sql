-- =====================================================================
-- Shared Living – run this AFTER 004_accept_chores.sql
-- Push notifications.
--
-- BEFORE RUNNING: replace the two values in section 1:
--   YOUR-PROJECT-ID      -> your project ID (from your Supabase URL)
--   YOUR-NOTIFY-SECRET   -> the same NOTIFY_SECRET you set on the Edge Function
--
-- Sends a notification when:
--   * a housemate marks a chore done            -> everyone else: "Needs your OK"
--   * your chore is approved or rejected        -> you
--   * it's 7pm and a chore on your list is due tonight -> you
-- =====================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------
-- 1. Where to send notifications (stored encrypted in Supabase Vault)
-- ---------------------------------------------------------------------
select vault.create_secret('https://YOUR-PROJECT-ID.supabase.co/functions/v1/notify', 'notify_url');
select vault.create_secret('YOUR-NOTIFY-SECRET', 'notify_secret');


-- ---------------------------------------------------------------------
-- 2. Each phone/browser that has notifications turned on
-- ---------------------------------------------------------------------
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "read own subscriptions" on push_subscriptions
  for select using (user_id = auth.uid());

-- Turn notifications on for this device (moves it to you if someone else used it before)
create or replace function save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh,
        auth = excluded.auth, user_agent = excluded.user_agent, created_at = now();
end;
$$;

-- Turn notifications off for this device
create or replace function delete_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;


-- ---------------------------------------------------------------------
-- 3. Calling the Edge Function
-- ---------------------------------------------------------------------
create or replace function notify_edge(payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  fn_url text;
  secret text;
begin
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'notify_secret';
  if fn_url is null or secret is null then
    return; -- not set up yet: skip quietly rather than block the chore update
  end if;
  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
    body    := payload
  );
end;
$$;
revoke execute on function notify_edge(jsonb) from public, anon, authenticated;

-- Chore marked done / approved / rejected
create or replace function chore_log_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' and old.status = 'claimed' then
    perform notify_edge(jsonb_build_object('type', 'needs_ok', 'log_id', new.id));
  elsif new.status in ('approved', 'rejected') and old.status = 'pending' then
    perform notify_edge(jsonb_build_object('type', 'reviewed', 'log_id', new.id));
  end if;
  return new;
end;
$$;
revoke execute on function chore_log_notify() from public, anon, authenticated;

drop trigger if exists chore_logs_notify on chore_logs;
create trigger chore_logs_notify
  after update of status on chore_logs
  for each row execute function chore_log_notify();


-- ---------------------------------------------------------------------
-- 4. 7pm reminder for chores still on someone's list and due tonight
--    (runs every hour; only houses where it's 7pm right now are reminded)
-- ---------------------------------------------------------------------
create or replace function queue_evening_reminders()
returns void language plpgsql security definer set search_path = public as $$
declare ids jsonb;
begin
  select jsonb_agg(l.id) into ids
    from chore_logs l
    join houses h on h.id = l.house_id
   where l.status = 'claimed'
     and extract(hour from now() at time zone h.timezone) = 19
     and l.due_at > now()
     and l.due_at <= now() + interval '6 hours';
  if ids is not null then
    perform notify_edge(jsonb_build_object('type', 'reminder', 'log_ids', ids));
  end if;
end;
$$;
revoke execute on function queue_evening_reminders() from public, anon, authenticated;

select cron.unschedule('evening-chore-reminders')
 where exists (select 1 from cron.job where jobname = 'evening-chore-reminders');
select cron.schedule('evening-chore-reminders', '0 * * * *', 'select public.queue_evening_reminders()');

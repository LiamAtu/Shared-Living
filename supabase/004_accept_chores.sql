-- =====================================================================
-- Shared Living – run this AFTER 002_profiles_on_signup.sql
-- (and before 005_notifications.sql)
-- Nothing to replace in this one: paste it all and Run.
--
-- Accepting chores. Instead of logging a chore after doing it,
-- a housemate now:
--   1. accepts (claims) a chore, which puts it on their list
--      * daily chores are due by midnight tonight
--      * weekly chores are due by Sunday midnight
--   2. marks it done before the deadline, so it goes to "pending"
--   3. a housemate approves or rejects it (review_chore_log, from 001)
-- Claims that pass their deadline become "expired".
--
-- Also adds:
--   * a cooldown for weekly chores (rest X days after being done)
--   * an optional monthly limit per person for each chore
--   * a sort order for chores, and a timezone for each house
--
-- This file replaces the old 003 and 004 scripts in one go.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Houses: which timezone "today" and "midnight" are in
-- ---------------------------------------------------------------------
alter table houses
  add column if not exists timezone text not null default 'Europe/Dublin';


-- ---------------------------------------------------------------------
-- 2. Chores: daily or weekly only, plus cooldown, limit and order
-- ---------------------------------------------------------------------
update chores set suggested_frequency = 'weekly'
 where suggested_frequency not in ('daily', 'weekly');

alter table chores drop constraint if exists chores_suggested_frequency_check;
alter table chores add constraint chores_suggested_frequency_check
  check (suggested_frequency in ('daily', 'weekly'));

alter table chores
  add column if not exists cooldown_days        int not null default 0
                           check (cooldown_days >= 0),
  add column if not exists max_per_person_month int
                           check (max_per_person_month is null or max_per_person_month > 0),
  add column if not exists sort_order           int not null default 100;


-- ---------------------------------------------------------------------
-- 3. Chore logs: claimed -> pending -> approved / rejected (or expired)
-- ---------------------------------------------------------------------

-- A claimed chore isn't completed yet, so completed_at starts empty
alter table chore_logs alter column completed_at drop not null;
alter table chore_logs alter column completed_at drop default;

alter table chore_logs
  add column if not exists claimed_at   timestamptz not null default now(),
  add column if not exists due_at       timestamptz,
  add column if not exists period_start date;      -- the day (daily) or Monday (weekly) it counts for

-- The time to show in the activity feed: done time, else deadline, else claim time
alter table chore_logs
  add column if not exists activity_at timestamptz
  generated always as (coalesce(completed_at, due_at, claimed_at)) stored;

alter table chore_logs drop constraint if exists chore_logs_status_check;
alter table chore_logs add constraint chore_logs_status_check
  check (status in ('claimed', 'pending', 'approved', 'rejected', 'expired'));

create index if not exists chore_logs_chore_status_idx on chore_logs (chore_id, status);
create index if not exists chore_logs_activity_idx     on chore_logs (house_id, activity_at desc);

-- Chores are no longer logged directly: they go through claim_chore() below
drop trigger  if exists chore_logs_before_insert on chore_logs;
drop function if exists before_chore_log_insert();
drop policy   if exists "log own" on chore_logs;


-- ---------------------------------------------------------------------
-- 4. Expire claims whose deadline has passed
-- ---------------------------------------------------------------------
create or replace function expire_overdue_claims(p_house uuid)
returns void language sql security definer set search_path = public as $$
  update chore_logs
     set status = 'expired'
   where house_id = p_house and status = 'claimed' and due_at <= now();
$$;


-- ---------------------------------------------------------------------
-- 5. Work out a chore's state for one person
--    available | mine | taken | done | cooldown | limit
-- ---------------------------------------------------------------------
create or replace function _chore_state(p_chore uuid, p_user uuid)
returns table(state text, available_from date, holder_id uuid, log_id uuid,
              due_at timestamptz, my_count int)
language plpgsql stable security definer set search_path = public as $$
declare
  c         chores;
  l         chore_logs;
  tz        text;
  today     date;
  last_done date;
begin
  select * into c from chores where id = p_chore;
  select coalesce(h.timezone, 'Europe/Dublin') into tz from houses h where h.id = c.house_id;
  today := (now() at time zone tz)::date;

  select count(*)::int into my_count
    from chore_logs x
   where x.chore_id = c.id and x.user_id = p_user
     and x.status in ('claimed', 'pending', 'approved')
     and date_trunc('month', x.claimed_at at time zone tz) = date_trunc('month', now() at time zone tz);

  -- Someone has it on their list
  select * into l from chore_logs x
   where x.chore_id = c.id and x.status = 'claimed' and x.due_at > now()
   order by x.claimed_at desc limit 1;
  if l.id is not null then
    state     := case when l.user_id = p_user then 'mine' else 'taken' end;
    holder_id := l.user_id;
    log_id    := l.id;
    due_at    := l.due_at;
    return next;
    return;
  end if;

  if c.suggested_frequency = 'daily' then
    -- Already done today (rejected ones don't count, so it can be redone)
    select * into l from chore_logs x
     where x.chore_id = c.id and x.period_start = today
       and x.status in ('pending', 'approved')
     order by x.completed_at desc limit 1;
    if l.id is not null then
      state     := 'done';
      holder_id := l.user_id;
      log_id    := l.id;
      return next;
      return;
    end if;
  else
    -- Weekly: rests for cooldown_days after it was last done
    select max((x.completed_at at time zone tz)::date) into last_done
      from chore_logs x
     where x.chore_id = c.id and x.status in ('pending', 'approved');
    if last_done is not null and today < last_done + c.cooldown_days then
      state          := 'cooldown';
      available_from := last_done + c.cooldown_days;
      return next;
      return;
    end if;
  end if;

  if c.max_per_person_month is not null and my_count >= c.max_per_person_month then
    state := 'limit';
    return next;
    return;
  end if;

  state := 'available';
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. The chore board: every active chore and its state for me
-- ---------------------------------------------------------------------
create or replace function chore_board()
returns table(chore_id uuid, name text, credit_value int, frequency text,
              max_per_person_month int, state text, available_from date,
              holder_name text, log_id uuid, due_at timestamptz, my_count int)
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
  c record;
  s record;
begin
  select m.house_id into h from house_members m where m.user_id = auth.uid() limit 1;
  if h is null then
    raise exception 'You are not in a house yet';
  end if;

  perform expire_overdue_claims(h);

  for c in
    select * from chores ch
     where ch.house_id = h and ch.is_active
     order by ch.suggested_frequency, ch.sort_order, ch.name
  loop
    select * into s from _chore_state(c.id, auth.uid());
    chore_id             := c.id;
    name                 := c.name;
    credit_value         := c.credit_value;
    frequency            := c.suggested_frequency;
    max_per_person_month := c.max_per_person_month;
    state                := s.state;
    available_from       := s.available_from;
    log_id               := s.log_id;
    due_at               := s.due_at;
    my_count             := s.my_count;
    select p.display_name into holder_name from profiles p where p.id = s.holder_id;
    return next;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------
-- 7. Accept a chore (put it on my list)
-- ---------------------------------------------------------------------
create or replace function claim_chore(p_chore uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c      chores;
  s      record;
  tz     text;
  today  date;
  period date;
  due    timestamptz;
  new_id uuid;
begin
  -- Lock the chore so two people can't accept it at the same moment
  select * into c from chores where id = p_chore and is_active for update;
  if c.id is null then raise exception 'Chore not found'; end if;
  if not is_house_member(c.house_id) then raise exception 'You are not in this house'; end if;

  perform expire_overdue_claims(c.house_id);

  select * into s from _chore_state(c.id, auth.uid());
  case s.state
    when 'mine'     then raise exception 'It''s already on your list';
    when 'taken'    then raise exception 'Someone else has already accepted this';
    when 'done'     then raise exception 'This has already been done today';
    when 'cooldown' then raise exception 'This is available again on %', to_char(s.available_from, 'FMDay FMDD Mon');
    when 'limit'    then raise exception 'You''ve done this % times this month, which is the limit', c.max_per_person_month;
    else null;
  end case;

  select coalesce(h.timezone, 'Europe/Dublin') into tz from houses h where h.id = c.house_id;
  today := (now() at time zone tz)::date;

  if c.suggested_frequency = 'daily' then
    period := today;                                   -- due by midnight tonight
    due    := (today + 1)::timestamp at time zone tz;
  else
    period := date_trunc('week', today)::date;         -- Monday
    due    := (period + 7)::timestamp at time zone tz; -- due by Sunday midnight
  end if;

  insert into chore_logs (house_id, chore_id, user_id, credits_awarded, status,
                          claimed_at, period_start, due_at, completed_at)
  values (c.house_id, c.id, auth.uid(), c.credit_value, 'claimed',
          now(), period, due, null)
  returning id into new_id;

  return new_id;
end;
$$;


-- ---------------------------------------------------------------------
-- 8. Mark my chore as done (it then waits for a housemate's OK)
-- ---------------------------------------------------------------------
create or replace function complete_chore(p_log uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l chore_logs;
begin
  select * into l from chore_logs where id = p_log for update;
  if l.id is null or l.user_id <> auth.uid() then
    raise exception 'That chore isn''t on your list';
  end if;
  if l.status <> 'claimed' then
    raise exception 'That chore is no longer on your list';
  end if;
  if l.due_at <= now() then
    raise exception 'Too late, the deadline for this has passed';
  end if;

  update chore_logs
     set status = 'pending', completed_at = now(), note = nullif(trim(p_note), '')
   where id = l.id;
end;
$$;


-- ---------------------------------------------------------------------
-- 9. Give a chore back (take it off my list)
-- ---------------------------------------------------------------------
create or replace function release_chore(p_log uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from chore_logs
   where id = p_log and user_id = auth.uid() and status = 'claimed';
  if not found then
    raise exception 'That chore isn''t on your list';
  end if;
end;
$$;

-- =====================================================================
-- Shared Living – run this AFTER 005_notifications.sql
-- Nothing to replace in this one: paste it all and Run.
--
--   * Weekly dinner menu (Monday–Sunday, anyone in the house can edit)
--   * Dinner suggestion box
--   * Shared shopping list
--   * Chore history older than last month is deleted automatically
--   * 9am "pick your chores for today" notification
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Dinner menu: one dinner per house per day
-- ---------------------------------------------------------------------
create table if not exists dinner_menu (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references houses(id) on delete cascade,
  day         date not null,
  meal        text not null check (length(trim(meal)) between 1 and 80),
  note        text check (note is null or length(note) <= 140),
  updated_by  uuid references profiles(id) on delete set null default auth.uid(),
  updated_at  timestamptz not null default now(),
  unique (house_id, day)
);

alter table dinner_menu enable row level security;
create policy "read menu"   on dinner_menu for select using (is_house_member(house_id));
create policy "add menu"    on dinner_menu for insert with check (is_house_member(house_id));
create policy "edit menu"   on dinner_menu for update using (is_house_member(house_id))
                                             with check (is_house_member(house_id));
create policy "clear menu"  on dinner_menu for delete using (is_house_member(house_id));

-- Set (or replace) the dinner for a day
create or replace function set_dinner(p_day date, p_meal text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  select house_id into h from house_members where user_id = auth.uid() limit 1;
  if h is null then raise exception 'You are not in a house'; end if;
  if coalesce(trim(p_meal), '') = '' then raise exception 'Enter a dinner'; end if;
  insert into dinner_menu (house_id, day, meal, note, updated_by, updated_at)
  values (h, p_day, trim(p_meal), nullif(trim(p_note), ''), auth.uid(), now())
  on conflict (house_id, day) do update
    set meal = excluded.meal, note = excluded.note,
        updated_by = excluded.updated_by, updated_at = now();
end;
$$;

-- Every dinner the house has had or planned, for the randomise button
create or replace function past_dinners()
returns table (meal text, times int, last_day date)
language sql stable security definer set search_path = public as $$
  select min(d.meal), count(*)::int, max(d.day)
    from dinner_menu d
   where d.house_id = (select house_id from house_members where user_id = auth.uid() limit 1)
   group by lower(d.meal)
   order by 2 desc, 1;
$$;


-- ---------------------------------------------------------------------
-- 2. Suggestion box
-- ---------------------------------------------------------------------
create table if not exists dinner_suggestions (
  id            uuid primary key default gen_random_uuid(),
  house_id      uuid not null references houses(id) on delete cascade,
  meal          text not null check (length(trim(meal)) between 1 and 80),
  suggested_by  uuid references profiles(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists dinner_suggestions_house_idx on dinner_suggestions (house_id, created_at desc);

alter table dinner_suggestions enable row level security;
create policy "read suggestions" on dinner_suggestions for select using (is_house_member(house_id));
create policy "add suggestion"   on dinner_suggestions for insert
  with check (is_house_member(house_id) and suggested_by = auth.uid());
-- Anyone can remove a suggestion once it's been used or isn't wanted
create policy "remove suggestion" on dinner_suggestions for delete using (is_house_member(house_id));


-- ---------------------------------------------------------------------
-- 3. Shopping list
-- ---------------------------------------------------------------------
create table if not exists shopping_items (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid not null references houses(id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  added_by    uuid references profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  bought      boolean not null default false,
  bought_by   uuid references profiles(id) on delete set null,
  bought_at   timestamptz
);
create index if not exists shopping_items_house_idx on shopping_items (house_id, bought, created_at desc);

alter table shopping_items enable row level security;
create policy "read list"   on shopping_items for select using (is_house_member(house_id));
create policy "add item"    on shopping_items for insert
  with check (is_house_member(house_id) and added_by = auth.uid());
create policy "tick item"   on shopping_items for update using (is_house_member(house_id))
                                                with check (is_house_member(house_id));
create policy "remove item" on shopping_items for delete using (is_house_member(house_id));

-- Fill in who ticked it off and when
create or replace function shopping_item_bought()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.bought and not coalesce(old.bought, false) then
    new.bought_by := auth.uid();
    new.bought_at := now();
  elsif not new.bought then
    new.bought_by := null;
    new.bought_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists shopping_items_bought on shopping_items;
create trigger shopping_items_bought before update of bought on shopping_items
  for each row execute function shopping_item_bought();


-- ---------------------------------------------------------------------
-- 4. Live updates for the new lists
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table dinner_menu, dinner_suggestions, shopping_items;


-- ---------------------------------------------------------------------
-- 5. Housekeeping (runs every night at 3am)
--    * Chore history older than the start of last month is deleted
--    * Shopping items bought more than a week ago are cleared
-- ---------------------------------------------------------------------
create or replace function cleanup_old_history()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from chore_logs l
   using houses h
   where h.id = l.house_id
     and l.status <> 'claimed'
     and coalesce(l.completed_at, l.due_at, l.claimed_at)
         < (date_trunc('month', now() at time zone h.timezone) - interval '1 month')
           at time zone h.timezone;

  delete from shopping_items
   where bought and bought_at < now() - interval '7 days';
end;
$$;
revoke execute on function cleanup_old_history() from public, anon, authenticated;

select cron.unschedule('cleanup-old-history')
 where exists (select 1 from cron.job where jobname = 'cleanup-old-history');
select cron.schedule('cleanup-old-history', '0 3 * * *', 'select public.cleanup_old_history()');


-- ---------------------------------------------------------------------
-- 6. 9am "pick your chores for today" notification
--    (runs every hour; only houses where it's 9am right now are sent it)
-- ---------------------------------------------------------------------
create or replace function queue_morning_plan()
returns void language plpgsql security definer set search_path = public as $$
declare ids jsonb;
begin
  select jsonb_agg(h.id) into ids
    from houses h
   where extract(hour from now() at time zone h.timezone) = 9;
  if ids is not null then
    perform notify_edge(jsonb_build_object('type', 'morning', 'house_ids', ids));
  end if;
end;
$$;
revoke execute on function queue_morning_plan() from public, anon, authenticated;

select cron.unschedule('morning-plan')
 where exists (select 1 from cron.job where jobname = 'morning-plan');
select cron.schedule('morning-plan', '0 * * * *', 'select public.queue_morning_plan()');

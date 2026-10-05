-- =====================================================================
-- Shared Living – Supabase schema
-- Paste into Supabase: SQL Editor -> New query -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

-- A house (one group of housemates sharing rent)
create table houses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  monthly_rent  numeric(10,2) not null default 150.00,   -- what you pay if you earn no credits
  currency      text not null default 'EUR',
  -- 'proportional'   : earn 60% of your target -> pay 40% of rent
  -- 'all_or_nothing' : hit your target -> pay €0, otherwise pay full rent
  rent_mode     text not null default 'proportional'
                check (rent_mode in ('proportional', 'all_or_nothing')),
  invite_code   text unique not null default substr(md5(random()::text), 1, 8),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

-- Public profile for each logged-in user (Supabase Auth handles passwords)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Who lives in which house, and how many credits they need each month
create table house_members (
  house_id               uuid not null references houses(id) on delete cascade,
  user_id                uuid not null references profiles(id) on delete cascade,
  role                   text not null default 'member' check (role in ('admin', 'member')),
  monthly_credit_target  int  not null default 100 check (monthly_credit_target > 0),
  joined_at              timestamptz not null default now(),
  primary key (house_id, user_id)
);

-- The menu of chores and what each one is worth
create table chores (
  id                   uuid primary key default gen_random_uuid(),
  house_id             uuid not null references houses(id) on delete cascade,
  name                 text not null,                 -- e.g. 'Clean toilet'
  description          text,
  credit_value         int  not null check (credit_value > 0),
  suggested_frequency  text not null default 'weekly'
                       check (suggested_frequency in ('daily', 'weekly', 'monthly', 'as_needed')),
  is_active            boolean not null default true,  -- hide instead of delete, keeps history intact
  created_at           timestamptz not null default now()
);

-- Every time someone does a chore
create table chore_logs (
  id               uuid primary key default gen_random_uuid(),
  house_id         uuid not null references houses(id) on delete cascade,
  chore_id         uuid not null references chores(id),
  user_id          uuid not null references profiles(id),
  credits_awarded  int  not null,          -- copied from the chore at the time, so later price changes don't rewrite history
  note             text,
  photo_path       text,                   -- optional proof, stored in Supabase Storage
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  completed_at     timestamptz not null default now(),
  check (reviewed_by is null or reviewed_by <> user_id)   -- can't approve your own chore
);

create index chore_logs_house_month_idx on chore_logs (house_id, completed_at);
create index chore_logs_user_idx        on chore_logs (user_id, completed_at);
create index chores_house_idx           on chores (house_id);
create index house_members_user_idx     on house_members (user_id);


-- ---------------------------------------------------------------------
-- 2. HELPER FUNCTIONS
-- ---------------------------------------------------------------------

create or replace function is_house_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from house_members where house_id = h and user_id = auth.uid());
$$;

create or replace function is_house_admin(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from house_members
                 where house_id = h and user_id = auth.uid() and role = 'admin');
$$;

-- Create a house and make the creator its admin, in one step
create or replace function create_house(house_name text, rent numeric default 150.00)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  insert into houses (name, monthly_rent, created_by)
  values (house_name, rent, auth.uid())
  returning id into new_id;

  insert into house_members (house_id, user_id, role)
  values (new_id, auth.uid(), 'admin');

  return new_id;
end;
$$;

-- Join a house with the invite code a housemate shared
create or replace function join_house(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  select id into h from houses where invite_code = code;
  if h is null then
    raise exception 'Invite code not found';
  end if;

  insert into house_members (house_id, user_id)
  values (h, auth.uid())
  on conflict do nothing;

  return h;
end;
$$;

-- Approve or reject a housemate's chore (never your own)
create or replace function review_chore_log(log_id uuid, approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare l chore_logs;
begin
  select * into l from chore_logs where id = log_id;
  if l.id is null                    then raise exception 'Log not found'; end if;
  if not is_house_member(l.house_id) then raise exception 'Not in this house'; end if;
  if l.user_id = auth.uid()          then raise exception 'You cannot review your own chore'; end if;
  if l.status <> 'pending'           then raise exception 'Already reviewed'; end if;

  update chore_logs
     set status      = case when approve then 'approved' else 'rejected' end,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = log_id;
end;
$$;

-- When a chore is logged, fill in the trusted fields server-side
-- (so nobody can award themselves 1000 credits from the app)
create or replace function before_chore_log_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare c chores;
begin
  select * into c from chores where id = new.chore_id and is_active;
  if c.id is null then raise exception 'Chore not found or inactive'; end if;

  new.house_id        := c.house_id;
  new.credits_awarded := c.credit_value;
  new.user_id         := auth.uid();
  new.status          := 'pending';
  new.reviewed_by     := null;
  new.reviewed_at     := null;
  if new.completed_at is null or new.completed_at > now() then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger chore_logs_before_insert
  before insert on chore_logs
  for each row execute function before_chore_log_insert();


-- ---------------------------------------------------------------------
-- 3. MONTHLY STATEMENT (credits earned, the "red number", rent owed)
-- ---------------------------------------------------------------------

create view monthly_statements with (security_invoker = true) as
with months as (
  select m.house_id, m.user_id, gs::date as month
  from house_members m,
       generate_series(date_trunc('month', m.joined_at),
                       date_trunc('month', now()),
                       interval '1 month') as gs
),
earned as (
  select house_id, user_id,
         date_trunc('month', completed_at)::date as month,
         sum(credits_awarded) as credits
  from chore_logs
  where status = 'approved'
  group by 1, 2, 3
)
select
  mo.house_id,
  mo.user_id,
  mo.month,
  coalesce(e.credits, 0)                                              as credits_earned,
  m.monthly_credit_target,
  greatest(m.monthly_credit_target - coalesce(e.credits, 0), 0)       as credits_remaining,  -- the red number
  h.monthly_rent,
  case
    when coalesce(e.credits, 0) >= m.monthly_credit_target then 0
    when h.rent_mode = 'all_or_nothing'                    then h.monthly_rent
    else round(h.monthly_rent
               * (1 - coalesce(e.credits, 0)::numeric / m.monthly_credit_target), 2)
  end                                                                 as rent_owed
from months mo
join house_members m on m.house_id = mo.house_id and m.user_id = mo.user_id
join houses h        on h.id = mo.house_id
left join earned e   on e.house_id = mo.house_id
                    and e.user_id  = mo.user_id
                    and e.month    = mo.month;


-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (who can see / change what)
-- ---------------------------------------------------------------------

alter table houses        enable row level security;
alter table profiles      enable row level security;
alter table house_members enable row level security;
alter table chores        enable row level security;
alter table chore_logs    enable row level security;

-- Houses: members see their house; admins edit rent settings
create policy "members read house"  on houses for select using (is_house_member(id));
create policy "admins update house" on houses for update using (is_house_admin(id));

-- Profiles: see yourself and your housemates; edit only yourself
create policy "read own and housemates" on profiles for select using (
  id = auth.uid()
  or exists (select 1 from house_members a
             join house_members b on a.house_id = b.house_id
             where a.user_id = auth.uid() and b.user_id = profiles.id)
);
create policy "insert own profile" on profiles for insert with check (id = auth.uid());
create policy "update own profile" on profiles for update using (id = auth.uid());

-- Members: see your housemates; admins set targets; anyone can leave
create policy "read housemates"      on house_members for select using (is_house_member(house_id));
create policy "admins edit members"  on house_members for update using (is_house_admin(house_id));
create policy "leave or remove"      on house_members for delete
  using (user_id = auth.uid() or is_house_admin(house_id));

-- Chores: everyone in the house sees them; admins set the list and prices
create policy "read chores"    on chores for select using (is_house_member(house_id));
create policy "admins add"     on chores for insert with check (is_house_admin(house_id));
create policy "admins update"  on chores for update using (is_house_admin(house_id));

-- Chore logs: everyone in the house sees them; you log your own;
-- you can delete your own while still pending; reviews go through review_chore_log()
create policy "read logs"   on chore_logs for select using (is_house_member(house_id));
create policy "log own"     on chore_logs for insert
  with check (user_id = auth.uid() and is_house_member(house_id));
create policy "delete own pending" on chore_logs for delete
  using (user_id = auth.uid() and status = 'pending');


-- ---------------------------------------------------------------------
-- 5. EXAMPLE CHORE MENU (run after creating your house; swap in its id)
-- ---------------------------------------------------------------------
-- insert into chores (house_id, name, credit_value, suggested_frequency) values
--   ('<house-id>', 'Clean toilet',        15, 'weekly'),
--   ('<house-id>', 'Wash the dishes',      5, 'daily'),
--   ('<house-id>', 'Hoover living room',  10, 'weekly'),
--   ('<house-id>', 'Take out bins',        5, 'weekly'),
--   ('<house-id>', 'Clean kitchen',       15, 'weekly'),
--   ('<house-id>', 'Mop floors',          10, 'weekly');

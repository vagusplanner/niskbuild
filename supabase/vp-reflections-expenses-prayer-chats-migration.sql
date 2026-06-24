-- Vagus Planner: reflections, expenses, prayer logs, and chats (firstparty schema)
-- Run in Supabase SQL Editor. Purely additive — does NOT alter existing tables.
-- Prerequisite: firstparty schema + public.is_platform_owner() from firstparty-marketplace-layers-migration.sql

create schema if not exists firstparty;

-- ═══════════════════════════════════════════════════════════════════
-- Reflections
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vp_reflections_user_date
  on firstparty.vp_reflections (user_id, date desc nulls last);

-- ═══════════════════════════════════════════════════════════════════
-- Expenses
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null default 0,
  category text,
  description text,
  date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vp_expenses_user_date
  on firstparty.vp_expenses (user_id, date desc nulls last);

-- ═══════════════════════════════════════════════════════════════════
-- Prayer logs
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prayer_name text not null,
  prayed_at timestamptz,
  status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vp_prayer_logs_user_prayed
  on firstparty.vp_prayer_logs (user_id, prayed_at desc nulls last);

-- ═══════════════════════════════════════════════════════════════════
-- Chats
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  sender text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vp_chats_user_created
  on firstparty.vp_chats (user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_reflections enable row level security;
alter table firstparty.vp_expenses enable row level security;
alter table firstparty.vp_prayer_logs enable row level security;
alter table firstparty.vp_chats enable row level security;

drop policy if exists "Users manage own vp_reflections" on firstparty.vp_reflections;
create policy "Users manage own vp_reflections"
  on firstparty.vp_reflections for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_expenses" on firstparty.vp_expenses;
create policy "Users manage own vp_expenses"
  on firstparty.vp_expenses for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_prayer_logs" on firstparty.vp_prayer_logs;
create policy "Users manage own vp_prayer_logs"
  on firstparty.vp_prayer_logs for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_chats" on firstparty.vp_chats;
create policy "Users manage own vp_chats"
  on firstparty.vp_chats for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

-- Grants (safe to re-run — applies to all firstparty tables including new ones)
grant usage on schema firstparty to authenticated, service_role;
grant select, insert, update, delete on all tables in schema firstparty to authenticated, service_role;
grant usage, select on all sequences in schema firstparty to authenticated, service_role;

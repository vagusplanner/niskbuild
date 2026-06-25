-- Vagus Planner: goals & holidays (referenced by vp-rls-grants-fix-migration.sql)

create table if not exists firstparty.vp_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date timestamptz,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_vp_goals_user
  on firstparty.vp_goals (user_id, target_date nulls last);

create table if not exists firstparty.vp_holidays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  holiday_date date not null,
  notes text,
  recurring_yearly boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_vp_holidays_user_date
  on firstparty.vp_holidays (user_id, holiday_date);

alter table firstparty.vp_goals enable row level security;
alter table firstparty.vp_holidays enable row level security;

drop policy if exists "Users manage own vp_goals" on firstparty.vp_goals;
create policy "Users manage own vp_goals"
  on firstparty.vp_goals for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_holidays" on firstparty.vp_holidays;
create policy "Users manage own vp_holidays"
  on firstparty.vp_holidays for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant all on table firstparty.vp_goals to authenticated, service_role;
grant all on table firstparty.vp_holidays to authenticated, service_role;

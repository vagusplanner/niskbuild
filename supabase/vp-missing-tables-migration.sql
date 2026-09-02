-- Missing VP tables referenced in base44-compat but never migrated.
-- Also extends vp_goals / vp_holidays for client query compatibility.
--
-- Idempotent / defensive: safe to re-run after a partial failure.
-- Production may already have stub tables (e.g. Base44-era vp_islamic_events) with
-- a different schema — CREATE TABLE IF NOT EXISTS is a no-op in that case, so we
-- ALTER ADD COLUMN IF NOT EXISTS for every expected column before creating indexes.

-- ═══════════════════════════════════════════════════════════════════
-- Habits (Wellness, HabitTrackerPanel, SpiritualHabitTracker)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_habits (
  id uuid primary key default gen_random_uuid()
);

alter table firstparty.vp_habits add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table firstparty.vp_habits add column if not exists name text;
alter table firstparty.vp_habits add column if not exists description text;
alter table firstparty.vp_habits add column if not exists frequency text not null default 'daily';
alter table firstparty.vp_habits add column if not exists target_days jsonb not null default '[]'::jsonb;
alter table firstparty.vp_habits add column if not exists target_day_of_month smallint not null default 1;
alter table firstparty.vp_habits add column if not exists category text not null default 'other';
alter table firstparty.vp_habits add column if not exists color text not null default '#3b82f6';
alter table firstparty.vp_habits add column if not exists is_active boolean not null default true;
alter table firstparty.vp_habits add column if not exists completion_dates jsonb not null default '[]'::jsonb;
alter table firstparty.vp_habits add column if not exists streak integer not null default 0;
alter table firstparty.vp_habits add column if not exists best_streak integer not null default 0;
alter table firstparty.vp_habits add column if not exists auto_schedule boolean not null default false;
alter table firstparty.vp_habits add column if not exists reminder_enabled boolean not null default false;
alter table firstparty.vp_habits add column if not exists created_at timestamptz not null default now();
alter table firstparty.vp_habits add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_vp_habits_user_active
  on firstparty.vp_habits (user_id, is_active, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Habit completions
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_habit_completions (
  id uuid primary key default gen_random_uuid()
);

alter table firstparty.vp_habit_completions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table firstparty.vp_habit_completions add column if not exists habit_id uuid;
alter table firstparty.vp_habit_completions add column if not exists completed_at timestamptz not null default now();
alter table firstparty.vp_habit_completions add column if not exists notes text;
alter table firstparty.vp_habit_completions add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'firstparty'
      and t.relname = 'vp_habit_completions'
      and c.conname = 'vp_habit_completions_habit_id_fkey'
  ) then
    alter table firstparty.vp_habit_completions
      add constraint vp_habit_completions_habit_id_fkey
      foreign key (habit_id) references firstparty.vp_habits(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_vp_habit_completions_habit
  on firstparty.vp_habit_completions (habit_id, completed_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Group calendars (GroupCalendarManager)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_group_calendars (
  id uuid primary key default gen_random_uuid()
);

alter table firstparty.vp_group_calendars add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table firstparty.vp_group_calendars add column if not exists owner_email text;
alter table firstparty.vp_group_calendars add column if not exists name text;
alter table firstparty.vp_group_calendars add column if not exists description text;
alter table firstparty.vp_group_calendars add column if not exists type text not null default 'custom';
alter table firstparty.vp_group_calendars add column if not exists color text not null default '#3b82f6';
alter table firstparty.vp_group_calendars add column if not exists default_permission text not null default 'view';
alter table firstparty.vp_group_calendars add column if not exists is_active boolean not null default true;
alter table firstparty.vp_group_calendars add column if not exists created_at timestamptz not null default now();
alter table firstparty.vp_group_calendars add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_vp_group_calendars_owner
  on firstparty.vp_group_calendars (user_id, is_active, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Islamic events (Islamic page, HijriCalendar)
-- Production may already have an older/stub schema without hijri_* columns.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_islamic_events (
  id uuid primary key default gen_random_uuid()
);

alter table firstparty.vp_islamic_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table firstparty.vp_islamic_events add column if not exists title text;
alter table firstparty.vp_islamic_events add column if not exists hijri_month smallint;
alter table firstparty.vp_islamic_events add column if not exists hijri_day smallint;
alter table firstparty.vp_islamic_events add column if not exists hijri_year text;
alter table firstparty.vp_islamic_events add column if not exists gregorian_date date;
alter table firstparty.vp_islamic_events add column if not exists event_type text not null default 'custom';
alter table firstparty.vp_islamic_events add column if not exists category text not null default 'personal';
alter table firstparty.vp_islamic_events add column if not exists description text;
alter table firstparty.vp_islamic_events add column if not exists is_recurring boolean not null default true;
alter table firstparty.vp_islamic_events add column if not exists recurrence_type text;
alter table firstparty.vp_islamic_events add column if not exists recurrence_days jsonb not null default '[]'::jsonb;
alter table firstparty.vp_islamic_events add column if not exists color text;
alter table firstparty.vp_islamic_events add column if not exists reminder_enabled boolean not null default true;
alter table firstparty.vp_islamic_events add column if not exists created_at timestamptz not null default now();
alter table firstparty.vp_islamic_events add column if not exists updated_at timestamptz not null default now();

-- Indexes only after hijri_* / gregorian_date columns are confirmed present
create index if not exists idx_vp_islamic_events_user_hijri
  on firstparty.vp_islamic_events (user_id, hijri_month desc nulls last, hijri_day);

create index if not exists idx_vp_islamic_events_user_gregorian
  on firstparty.vp_islamic_events (user_id, gregorian_date desc nulls last);

-- ═══════════════════════════════════════════════════════════════════
-- Extend existing tables for client filter/sort compatibility
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_goals
  add column if not exists priority text not null default 'medium';

alter table firstparty.vp_holidays
  add column if not exists status text not null default 'planned';

-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_habits enable row level security;
alter table firstparty.vp_habit_completions enable row level security;
alter table firstparty.vp_group_calendars enable row level security;
alter table firstparty.vp_islamic_events enable row level security;

drop policy if exists "Users manage own vp_habits" on firstparty.vp_habits;
create policy "Users manage own vp_habits"
  on firstparty.vp_habits for all to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_habit_completions" on firstparty.vp_habit_completions;
create policy "Users manage own vp_habit_completions"
  on firstparty.vp_habit_completions for all to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_group_calendars" on firstparty.vp_group_calendars;
create policy "Users manage own vp_group_calendars"
  on firstparty.vp_group_calendars for all to authenticated
  using (
    auth.uid() = user_id
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

drop policy if exists "Users manage own vp_islamic_events" on firstparty.vp_islamic_events;
create policy "Users manage own vp_islamic_events"
  on firstparty.vp_islamic_events for all to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on table firstparty.vp_habits to authenticated, service_role;
grant select, insert, update, delete on table firstparty.vp_habit_completions to authenticated, service_role;
grant select, insert, update, delete on table firstparty.vp_group_calendars to authenticated, service_role;
grant select, insert, update, delete on table firstparty.vp_islamic_events to authenticated, service_role;

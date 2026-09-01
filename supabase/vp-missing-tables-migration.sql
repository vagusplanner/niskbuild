-- Missing VP tables referenced in base44-compat but never migrated.
-- Also extends vp_goals / vp_holidays for client query compatibility.

-- ═══════════════════════════════════════════════════════════════════
-- Habits (Wellness, HabitTrackerPanel, SpiritualHabitTracker)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  frequency text not null default 'daily',
  target_days jsonb not null default '[]'::jsonb,
  target_day_of_month smallint not null default 1,
  category text not null default 'other',
  color text not null default '#3b82f6',
  is_active boolean not null default true,
  completion_dates jsonb not null default '[]'::jsonb,
  streak integer not null default 0,
  best_streak integer not null default 0,
  auto_schedule boolean not null default false,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_habits_user_active
  on firstparty.vp_habits (user_id, is_active, created_at desc);

create table if not exists firstparty.vp_habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references firstparty.vp_habits(id) on delete cascade,
  completed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vp_habit_completions_habit
  on firstparty.vp_habit_completions (habit_id, completed_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Group calendars (GroupCalendarManager)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_group_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text,
  name text not null,
  description text,
  type text not null default 'custom',
  color text not null default '#3b82f6',
  default_permission text not null default 'view',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_group_calendars_owner
  on firstparty.vp_group_calendars (user_id, is_active, created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Islamic events (Islamic page, HijriCalendar — table was never created)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_islamic_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  hijri_month smallint,
  hijri_day smallint,
  hijri_year text,
  gregorian_date date,
  event_type text not null default 'custom',
  category text not null default 'personal',
  description text,
  is_recurring boolean not null default true,
  recurrence_type text,
  recurrence_days jsonb not null default '[]'::jsonb,
  color text,
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_islamic_events_user_hijri
  on firstparty.vp_islamic_events (user_id, hijri_month desc nulls last, hijri_day);

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

-- Vagus Planner: personal/group calendar sharing (CalendarSharingModal / SharedCalendar entity).
-- Run in Supabase SQL Editor. Safe to re-run.
-- Prerequisite: firstparty schema, public.is_platform_owner()

create schema if not exists firstparty;

create table if not exists firstparty.vp_shared_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  shared_with_email text not null,
  permission text not null default 'view'
    check (permission in ('view', 'edit', 'invite')),
  notify_on_changes boolean not null default true,
  calendar_type text not null default 'personal'
    check (calendar_type in ('personal', 'group')),
  group_calendar_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_shared_calendars_owner
  on firstparty.vp_shared_calendars (lower(owner_email));

create index if not exists idx_vp_shared_calendars_recipient
  on firstparty.vp_shared_calendars (lower(shared_with_email));

create unique index if not exists idx_vp_shared_calendars_personal_unique
  on firstparty.vp_shared_calendars (user_id, lower(shared_with_email))
  where calendar_type = 'personal' and group_calendar_id is null;

alter table firstparty.vp_shared_calendars enable row level security;

drop policy if exists "Users manage vp_shared_calendars" on firstparty.vp_shared_calendars;
create policy "Users manage vp_shared_calendars"
  on firstparty.vp_shared_calendars for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or lower(shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on firstparty.vp_shared_calendars to authenticated, service_role;

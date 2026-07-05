-- Vagus Planner: live location sharing for group/trip safety (firstparty schema)
-- Run in Supabase SQL Editor after firstparty schema exists.
-- Prerequisite: public.is_platform_owner() optional for admin bypass.

create schema if not exists firstparty;

create table if not exists firstparty.vp_live_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null check (context_type in ('group_chat', 'trip')),
  group_chat_id uuid,
  trip_id uuid,
  user_email text,
  user_name text,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters integer,
  battery_level integer,
  location_name text,
  is_sharing boolean not null default true,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_live_locations_context_check check (
    (context_type = 'group_chat' and group_chat_id is not null and trip_id is null)
    or (context_type = 'trip' and trip_id is not null and group_chat_id is null)
  )
);

-- One active row per user per trip or group chat context
create unique index if not exists idx_vp_live_locations_user_trip
  on firstparty.vp_live_locations (user_id, trip_id)
  where trip_id is not null;

create unique index if not exists idx_vp_live_locations_user_group_chat
  on firstparty.vp_live_locations (user_id, group_chat_id)
  where group_chat_id is not null;

create index if not exists idx_vp_live_locations_trip_sharing
  on firstparty.vp_live_locations (trip_id, last_updated_at desc)
  where is_sharing = true and trip_id is not null;

create index if not exists idx_vp_live_locations_group_sharing
  on firstparty.vp_live_locations (group_chat_id, last_updated_at desc)
  where is_sharing = true and group_chat_id is not null;

alter table firstparty.vp_live_locations enable row level security;

-- Users manage their own rows
drop policy if exists "Users insert own vp_live_locations" on firstparty.vp_live_locations;
create policy "Users insert own vp_live_locations"
  on firstparty.vp_live_locations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own vp_live_locations" on firstparty.vp_live_locations;
create policy "Users update own vp_live_locations"
  on firstparty.vp_live_locations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own vp_live_locations" on firstparty.vp_live_locations;
create policy "Users delete own vp_live_locations"
  on firstparty.vp_live_locations for delete
  to authenticated
  using (auth.uid() = user_id);

-- Read own location, or others in the same trip/group when you are actively sharing there
drop policy if exists "Users select vp_live_locations in shared context" on firstparty.vp_live_locations;
create policy "Users select vp_live_locations in shared context"
  on firstparty.vp_live_locations for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or (
      is_sharing = true
      and (
        (
          trip_id is not null
          and exists (
            select 1
            from firstparty.vp_live_locations mine
            where mine.user_id = auth.uid()
              and mine.trip_id = vp_live_locations.trip_id
              and mine.is_sharing = true
          )
        )
        or (
          group_chat_id is not null
          and exists (
            select 1
            from firstparty.vp_live_locations mine
            where mine.user_id = auth.uid()
              and mine.group_chat_id = vp_live_locations.group_chat_id
              and mine.is_sharing = true
          )
        )
      )
    )
  );

grant select, insert, update, delete on firstparty.vp_live_locations to authenticated, service_role;

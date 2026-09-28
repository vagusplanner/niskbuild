-- North South Consulting — foundation tables (DRAFT — do not apply until reviewed)
-- Additive only: creates firstparty.ns_* tables + helpers. Does NOT alter public.profiles
-- or any existing tables.
--
-- Prerequisites (already on production; replicate on sandbox before this file):
--   - schema firstparty
--   - firstparty.platform_owners
--   - public.is_platform_owner()
--   - firstparty schema exposed in Supabase API settings (same as VP)
--
-- Bookings write path (Phase 2 handlers, service_role):
--   - create-booking: validate body, set user_id from JWT, insert
--   - manage-calendar / update-booking: status, meet_link, calendar_event_id, reschedule
--   Clients: SELECT own rows only. No client insert/update/delete.
--
-- Safe apply: backup / PITR check → rehearse on sandbox → apply in one transaction.

begin;

create schema if not exists firstparty;

-- ---------------------------------------------------------------------------
-- Staff + user settings (replaces altering public.profiles)
-- Create ns_staff before ns_is_staff() so the SQL function can resolve it.
-- ---------------------------------------------------------------------------

create table if not exists firstparty.ns_staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table firstparty.ns_staff is
  'North South coach/admin allowlist. Platform owners need not be listed.';

create or replace function firstparty.ns_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, firstparty
as $$
  select
    public.is_platform_owner()
    or exists (
      select 1
      from firstparty.ns_staff s
      where s.user_id = auth.uid()
        and s.role in ('coach', 'admin')
    );
$$;

revoke all on function firstparty.ns_is_staff() from public;
grant execute on function firstparty.ns_is_staff() to authenticated, service_role;

comment on function firstparty.ns_is_staff() is
  'North South coach/admin (ns_staff) or NiskBuild platform owner.';

create table if not exists firstparty.ns_user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  recommended_tier text
    check (recommended_tier is null or recommended_tier in ('ai_self_service', 'hybrid', 'bespoke')),
  onboarding_completed boolean not null default false,
  onboarding jsonb not null default '{}'::jsonb,
  locale text,
  timezone text,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_firstparty_ns_user_settings_legacy_id
  on firstparty.ns_user_settings (legacy_id)
  where legacy_id is not null;

comment on table firstparty.ns_user_settings is
  'North South onboarding / tier prefs (Base44 User fields beyond role).';

-- ---------------------------------------------------------------------------
-- Core entities (Base44 → ns_*)
-- ---------------------------------------------------------------------------

-- Bookings: user_id ON DELETE SET NULL keeps the row for staff (email/name intact).
-- Account purge MUST delete by user_id and also by client_email matching the user.
-- Base44 UI: Booking.list (client) + Booking.create (→ server create-booking);
-- status / meet_link / calendar_event_id updates already go through manageCalendarEvent
-- (asServiceRole). No client or staff direct write policies — service_role only.
create table if not exists firstparty.ns_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  legacy_id text,
  client_name text,
  client_email text,
  client_company text,
  service_tier text
    check (service_tier is null or service_tier in ('ai_self_service', 'hybrid', 'bespoke')),
  session_type text,
  preferred_date text,
  preferred_time text,
  timezone text,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  calendar_event_id text,
  meet_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_bookings_user
  on firstparty.ns_bookings (user_id, created_at desc);
create index if not exists idx_firstparty_ns_bookings_status
  on firstparty.ns_bookings (status);
create index if not exists idx_firstparty_ns_bookings_client_email
  on firstparty.ns_bookings (lower(client_email));
create unique index if not exists idx_firstparty_ns_bookings_legacy_id
  on firstparty.ns_bookings (legacy_id)
  where legacy_id is not null;

comment on column firstparty.ns_bookings.user_id is
  'ON DELETE SET NULL — purge must also delete where lower(client_email)=lower(user email).';
comment on column firstparty.ns_bookings.message is
  'Client-facing goals/message from BookSession form (not coach-private).';

-- Coach-private booking notes (Base44 Booking.notes title = "Internal Notes").
-- Never read/written by the client UI; kept off ns_bookings so clients cannot see them
-- via SELECT on their own booking row.
create table if not exists firstparty.ns_booking_notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references firstparty.ns_bookings (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_booking_notes_booking
  on firstparty.ns_booking_notes (booking_id, created_at desc);

comment on table firstparty.ns_booking_notes is
  'Staff-only internal notes for a booking (Base44 Booking.notes). Clients have no access.';

create table if not exists firstparty.ns_leadership_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  legacy_id text,
  title text not null,
  description text,
  category text
    check (
      category is null
      or category in (
        'verbal_communication',
        'written_communication',
        'body_language',
        'media_presence',
        'executive_presence',
        'cross_cultural',
        'life_balance'
      )
    ),
  target_score numeric,
  current_score numeric,
  deadline text,
  status text not null default 'active'
    check (status in ('active', 'achieved', 'paused')),
  nudges_enabled boolean not null default true,
  milestones text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_leadership_goals_user
  on firstparty.ns_leadership_goals (user_id, status);
create index if not exists idx_firstparty_ns_leadership_goals_nudges
  on firstparty.ns_leadership_goals (nudges_enabled)
  where status = 'active' and nudges_enabled = true;
create unique index if not exists idx_firstparty_ns_leadership_goals_legacy_id
  on firstparty.ns_leadership_goals (legacy_id)
  where legacy_id is not null;

create table if not exists firstparty.ns_coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  legacy_id text,
  title text,
  session_type text
    check (
      session_type is null
      or session_type in (
        'verbal_communication',
        'written_communication',
        'body_language',
        'media_training',
        'life_coaching',
        'speech_review',
        'proposal_review'
      )
    ),
  ai_feedback text,
  submitted_text text,
  score numeric,
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_coaching_sessions_user
  on firstparty.ns_coaching_sessions (user_id, created_at desc);
create unique index if not exists idx_firstparty_ns_coaching_sessions_legacy_id
  on firstparty.ns_coaching_sessions (legacy_id)
  where legacy_id is not null;

create table if not exists firstparty.ns_goal_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references firstparty.ns_leadership_goals (id) on delete set null,
  legacy_id text,
  score numeric,
  reflection text,
  wins text,
  challenges text,
  next_action text,
  week_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_goal_check_ins_user
  on firstparty.ns_goal_check_ins (user_id, created_at desc);
create index if not exists idx_firstparty_ns_goal_check_ins_goal
  on firstparty.ns_goal_check_ins (goal_id);
create unique index if not exists idx_firstparty_ns_goal_check_ins_legacy_id
  on firstparty.ns_goal_check_ins (legacy_id)
  where legacy_id is not null;

create table if not exists firstparty.ns_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references firstparty.ns_coaching_sessions (id) on delete set null,
  goal_id uuid references firstparty.ns_leadership_goals (id) on delete set null,
  legacy_id text,
  commitment_text text,
  week_label text,
  implemented boolean not null default false,
  self_report_note text,
  nudge_sent boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_commitments_user
  on firstparty.ns_commitments (user_id, status);
create index if not exists idx_firstparty_ns_commitments_nudge
  on firstparty.ns_commitments (nudge_sent, status)
  where nudge_sent = false and status = 'pending';
create unique index if not exists idx_firstparty_ns_commitments_legacy_id
  on firstparty.ns_commitments (legacy_id)
  where legacy_id is not null;

create table if not exists firstparty.ns_learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references firstparty.ns_leadership_goals (id) on delete set null,
  legacy_id text,
  title text not null,
  goal_title text,
  category text,
  focus_area text,
  current_score numeric,
  target_score numeric,
  lessons jsonb not null default '[]'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused')),
  progress_pct numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_learning_paths_user
  on firstparty.ns_learning_paths (user_id, status);
create unique index if not exists idx_firstparty_ns_learning_paths_legacy_id
  on firstparty.ns_learning_paths (legacy_id)
  where legacy_id is not null;

-- Newsletter: inserts only via server newsletterSubscribe (service_role). No anon/client insert.
create table if not exists firstparty.ns_subscribers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  email text not null,
  name text,
  status text not null default 'active'
    check (status in ('active', 'unsubscribed')),
  source text not null default 'footer'
    check (source in ('footer', 'insights', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ns_subscribers_email_unique unique (email)
);

create unique index if not exists idx_firstparty_ns_subscribers_legacy_id
  on firstparty.ns_subscribers (legacy_id)
  where legacy_id is not null;

create table if not exists firstparty.ns_testimonials (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  client_name text,
  client_title text,
  quote text,
  avatar_url text,
  is_featured boolean not null default false,
  tier text
    check (tier is null or tier in ('ai_self_service', 'hybrid', 'bespoke')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_ns_testimonials_featured
  on firstparty.ns_testimonials (is_featured)
  where is_featured = true;
create unique index if not exists idx_firstparty_ns_testimonials_legacy_id
  on firstparty.ns_testimonials (legacy_id)
  where legacy_id is not null;

-- Google Calendar OAuth tokens — service_role only (mirror VP vp_google_calendar_connections).
-- Stored as plaintext text columns like VP today; Vault encryption is optional hardening.
create table if not exists firstparty.ns_google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text,
  access_token text,
  token_expiry timestamptz,
  calendar_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table firstparty.ns_google_calendar_connections is
  'OAuth tokens for NS coach Calendar — service_role only; never expose to clients.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table firstparty.ns_staff enable row level security;
alter table firstparty.ns_user_settings enable row level security;
alter table firstparty.ns_bookings enable row level security;
alter table firstparty.ns_booking_notes enable row level security;
alter table firstparty.ns_leadership_goals enable row level security;
alter table firstparty.ns_coaching_sessions enable row level security;
alter table firstparty.ns_goal_check_ins enable row level security;
alter table firstparty.ns_commitments enable row level security;
alter table firstparty.ns_learning_paths enable row level security;
alter table firstparty.ns_subscribers enable row level security;
alter table firstparty.ns_testimonials enable row level security;
alter table firstparty.ns_google_calendar_connections enable row level security;

-- ns_google_calendar_connections: RLS on, NO client policies (service_role bypasses RLS).

-- ns_staff: users read own row; platform owners manage all
drop policy if exists "ns_staff_select_own_or_owner" on firstparty.ns_staff;
create policy "ns_staff_select_own_or_owner"
  on firstparty.ns_staff for select
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "ns_staff_owner_write" on firstparty.ns_staff;
create policy "ns_staff_owner_write"
  on firstparty.ns_staff for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

-- ns_user_settings: own row; staff read/write
drop policy if exists "ns_user_settings_select" on firstparty.ns_user_settings;
create policy "ns_user_settings_select"
  on firstparty.ns_user_settings for select
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_user_settings_upsert_own" on firstparty.ns_user_settings;
create policy "ns_user_settings_upsert_own"
  on firstparty.ns_user_settings for insert
  to authenticated
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_user_settings_update_own" on firstparty.ns_user_settings;
create policy "ns_user_settings_update_own"
  on firstparty.ns_user_settings for update
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

-- ns_bookings: SELECT own or staff only. Writes via service_role handlers only.
drop policy if exists "ns_bookings_select" on firstparty.ns_bookings;
drop policy if exists "ns_bookings_insert" on firstparty.ns_bookings;
drop policy if exists "ns_bookings_update" on firstparty.ns_bookings;
drop policy if exists "ns_bookings_delete" on firstparty.ns_bookings;
create policy "ns_bookings_select"
  on firstparty.ns_bookings for select
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff());

-- ns_booking_notes: staff only (no client policies)
drop policy if exists "ns_booking_notes_staff_all" on firstparty.ns_booking_notes;
create policy "ns_booking_notes_staff_all"
  on firstparty.ns_booking_notes for all
  to authenticated
  using (firstparty.ns_is_staff())
  with check (firstparty.ns_is_staff());

-- Owner-scoped product tables
drop policy if exists "ns_leadership_goals_all" on firstparty.ns_leadership_goals;
create policy "ns_leadership_goals_all"
  on firstparty.ns_leadership_goals for all
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_coaching_sessions_all" on firstparty.ns_coaching_sessions;
create policy "ns_coaching_sessions_all"
  on firstparty.ns_coaching_sessions for all
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_goal_check_ins_all" on firstparty.ns_goal_check_ins;
create policy "ns_goal_check_ins_all"
  on firstparty.ns_goal_check_ins for all
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_commitments_all" on firstparty.ns_commitments;
create policy "ns_commitments_all"
  on firstparty.ns_commitments for all
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

drop policy if exists "ns_learning_paths_all" on firstparty.ns_learning_paths;
create policy "ns_learning_paths_all"
  on firstparty.ns_learning_paths for all
  to authenticated
  using (auth.uid() = user_id or firstparty.ns_is_staff())
  with check (auth.uid() = user_id or firstparty.ns_is_staff());

-- Subscribers: staff select/update only (writes via service_role handler)
drop policy if exists "ns_subscribers_insert" on firstparty.ns_subscribers;
drop policy if exists "ns_subscribers_staff_select" on firstparty.ns_subscribers;
create policy "ns_subscribers_staff_select"
  on firstparty.ns_subscribers for select
  to authenticated
  using (firstparty.ns_is_staff());

drop policy if exists "ns_subscribers_staff_update" on firstparty.ns_subscribers;
create policy "ns_subscribers_staff_update"
  on firstparty.ns_subscribers for update
  to authenticated
  using (firstparty.ns_is_staff())
  with check (firstparty.ns_is_staff());

-- Testimonials: split reads — anon featured-only (no ns_is_staff); authenticated featured or staff
drop policy if exists "ns_testimonials_public_read" on firstparty.ns_testimonials;
drop policy if exists "ns_testimonials_anon_featured_read" on firstparty.ns_testimonials;
create policy "ns_testimonials_anon_featured_read"
  on firstparty.ns_testimonials for select
  to anon
  using (is_featured = true);

drop policy if exists "ns_testimonials_authenticated_read" on firstparty.ns_testimonials;
create policy "ns_testimonials_authenticated_read"
  on firstparty.ns_testimonials for select
  to authenticated
  using (is_featured = true or firstparty.ns_is_staff());

drop policy if exists "ns_testimonials_staff_write" on firstparty.ns_testimonials;
create policy "ns_testimonials_staff_write"
  on firstparty.ns_testimonials for all
  to authenticated
  using (firstparty.ns_is_staff())
  with check (firstparty.ns_is_staff());

-- ---------------------------------------------------------------------------
-- GRANTs — revoke defaults first, then explicit ns_ grants only
-- ---------------------------------------------------------------------------

grant usage on schema firstparty to anon, authenticated, service_role;

revoke all on table firstparty.ns_staff from anon, authenticated;
revoke all on table firstparty.ns_user_settings from anon, authenticated;
revoke all on table firstparty.ns_bookings from anon, authenticated;
revoke all on table firstparty.ns_booking_notes from anon, authenticated;
revoke all on table firstparty.ns_leadership_goals from anon, authenticated;
revoke all on table firstparty.ns_coaching_sessions from anon, authenticated;
revoke all on table firstparty.ns_goal_check_ins from anon, authenticated;
revoke all on table firstparty.ns_commitments from anon, authenticated;
revoke all on table firstparty.ns_learning_paths from anon, authenticated;
revoke all on table firstparty.ns_subscribers from anon, authenticated;
revoke all on table firstparty.ns_testimonials from anon, authenticated;
revoke all on table firstparty.ns_google_calendar_connections from anon, authenticated;

grant select, insert, update, delete on firstparty.ns_staff to authenticated;
grant select, insert, update, delete on firstparty.ns_user_settings to authenticated;
grant select on firstparty.ns_bookings to authenticated;
grant select, insert, update, delete on firstparty.ns_booking_notes to authenticated;
grant select, insert, update, delete on firstparty.ns_leadership_goals to authenticated;
grant select, insert, update, delete on firstparty.ns_coaching_sessions to authenticated;
grant select, insert, update, delete on firstparty.ns_goal_check_ins to authenticated;
grant select, insert, update, delete on firstparty.ns_commitments to authenticated;
grant select, insert, update, delete on firstparty.ns_learning_paths to authenticated;

-- subscribers: staff clients may select/update; insert/delete via service_role only
grant select, update on firstparty.ns_subscribers to authenticated;

grant select on firstparty.ns_testimonials to anon, authenticated;
grant insert, update, delete on firstparty.ns_testimonials to authenticated;

-- service_role: full access on every ns_ table (bypasses RLS; grants still explicit)
grant select, insert, update, delete on firstparty.ns_staff to service_role;
grant select, insert, update, delete on firstparty.ns_user_settings to service_role;
grant select, insert, update, delete on firstparty.ns_bookings to service_role;
grant select, insert, update, delete on firstparty.ns_booking_notes to service_role;
grant select, insert, update, delete on firstparty.ns_leadership_goals to service_role;
grant select, insert, update, delete on firstparty.ns_coaching_sessions to service_role;
grant select, insert, update, delete on firstparty.ns_goal_check_ins to service_role;
grant select, insert, update, delete on firstparty.ns_commitments to service_role;
grant select, insert, update, delete on firstparty.ns_learning_paths to service_role;
grant select, insert, update, delete on firstparty.ns_subscribers to service_role;
grant select, insert, update, delete on firstparty.ns_testimonials to service_role;
grant select, insert, update, delete on firstparty.ns_google_calendar_connections to service_role;

commit;

-- =============================================================================
-- VERIFICATION (run AFTER commit — see ns-foundation-sandbox-rehearsal.sql)
-- =============================================================================

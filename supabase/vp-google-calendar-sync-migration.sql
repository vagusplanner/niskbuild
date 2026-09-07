-- Vagus Planner Google Calendar OAuth + sync columns (v1 read-only pull)
-- Prerequisite: buffer-social-hub-migration.sql (oauth_states), firstparty.vp_events, vp_sync_states
-- Expose firstparty in Supabase Dashboard → API → Exposed schemas

-- ═══════════════════════════════════════════════════════════════════
-- oauth_states: allow google_calendar provider (separate from Sign-In)
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.oauth_states
  drop constraint if exists oauth_states_provider_check;

alter table firstparty.oauth_states
  add constraint oauth_states_provider_check
  check (provider in ('buffer', 'google_calendar'));

-- ═══════════════════════════════════════════════════════════════════
-- Server-only Google Calendar OAuth tokens (one account per user in v1)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text,
  google_account_email text,
  calendar_id text not null default 'primary',
  status text not null default 'active'
    check (status in ('active', 'revoked', 'error')),
  revoked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_google_calendar_connections_user_unique unique (user_id)
);

create index if not exists idx_vp_google_calendar_connections_status
  on firstparty.vp_google_calendar_connections (user_id, status);

alter table firstparty.vp_google_calendar_connections enable row level security;

-- Tokens must never be readable via the anon/authenticated Supabase client.
-- All access goes through the service_role admin client on the API server.
drop policy if exists "Service manages vp_google_calendar_connections"
  on firstparty.vp_google_calendar_connections;
create policy "Service manages vp_google_calendar_connections"
  on firstparty.vp_google_calendar_connections for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on firstparty.vp_google_calendar_connections
  to service_role;

-- Explicitly do NOT grant token table access to authenticated / anon.

-- ═══════════════════════════════════════════════════════════════════
-- vp_events: fields needed for Google import dedupe + source tagging
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_events
  add column if not exists end_date timestamptz,
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists external_calendar_type text,
  add column if not exists is_all_day boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_vp_events_user_external_id
  on firstparty.vp_events (user_id, external_id)
  where external_id is not null;

create index if not exists idx_vp_events_user_source
  on firstparty.vp_events (user_id, source)
  where source is not null;

comment on table firstparty.vp_google_calendar_connections is
  'OAuth tokens for Google Calendar sync — service_role only; never expose to clients';

comment on column firstparty.vp_events.external_id is
  'Stable external id, e.g. gcal:primary:<googleEventId>, for sync upsert/dedupe';

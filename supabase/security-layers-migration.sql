-- Security layers: phone hash + concurrent sessions (run in Supabase SQL editor)

-- Phone verification (hash only — never store raw numbers)
alter table profiles
  add column if not exists phone_hash text,
  add column if not exists phone_verified boolean default false;

create unique index if not exists idx_profiles_phone_hash_unique
  on profiles (phone_hash)
  where phone_hash is not null;

-- Drop legacy plaintext / manual OTP columns if present
alter table profiles
  drop column if exists phone_number,
  drop column if exists phone_verify_code_hash,
  drop column if exists phone_verify_expires;

-- Active sessions (device tracking)
create table if not exists active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token text not null,
  device_fingerprint text not null,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  user_agent text,
  unique (user_id, session_token)
);

-- Migrate legacy column names if upgrading from monetization-guards migration
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'active_sessions' and column_name = 'session_key'
  ) then
    alter table active_sessions rename column session_key to session_token;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_name = 'active_sessions' and column_name = 'last_seen'
  ) then
    alter table active_sessions rename column last_seen to last_active;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'active_sessions' and column_name = 'device_fingerprint'
  ) then
    alter table active_sessions add column device_fingerprint text not null default 'legacy';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'active_sessions' and column_name = 'created_at'
  ) then
    alter table active_sessions add column created_at timestamptz not null default now();
  end if;
end $$;

create index if not exists idx_active_sessions_user_active
  on active_sessions (user_id, last_active desc);

-- Pending third-session email confirmations
create table if not exists pending_session_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_token text not null,
  device_fingerprint text not null,
  confirm_token text not null unique,
  user_agent text,
  expires_at timestamptz not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pending_session_user
  on pending_session_approvals (user_id, created_at desc);

alter table active_sessions enable row level security;
alter table pending_session_approvals enable row level security;

create policy "No direct client access to active_sessions"
  on active_sessions for all using (false) with check (false);

create policy "No direct client access to pending_session_approvals"
  on pending_session_approvals for all using (false) with check (false);

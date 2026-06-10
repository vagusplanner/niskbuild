-- Privacy-first B2B analytics layer (run in Supabase SQL editor)
-- NO user_id, email, IP, or raw prompts — macro telemetry only

create table if not exists public_analytics_telemetry (
  id uuid primary key default gen_random_uuid(),
  telemetry_id text not null unique,
  timestamp_hourly timestamptz not null,
  user_demographic_tier text not null default 'unspecified',
  app_vertical text not null,
  core_stack jsonb not null default '[]'::jsonb,
  ai_model_used text not null,
  generation_success boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_telemetry_timestamp on public_analytics_telemetry (timestamp_hourly desc);
create index if not exists idx_telemetry_vertical on public_analytics_telemetry (app_vertical);
create index if not exists idx_telemetry_demographic on public_analytics_telemetry (user_demographic_tier);

alter table public_analytics_telemetry enable row level security;

-- No public read/write — service role inserts via API only
create policy "No direct client access to telemetry"
  on public_analytics_telemetry
  for all
  using (false)
  with check (false);

-- Profile fields for demographic band + opt-out (auth DB, separate from analytics)
alter table profiles
  add column if not exists demographic_tier text default 'unspecified',
  add column if not exists telemetry_opt_out boolean default false;

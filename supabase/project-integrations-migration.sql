-- Prompt 8: project integrations (Stripe inject, etc.)

create table if not exists project_integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  integration_name text not null,
  status text not null default 'active' check (status in ('active', 'pending')),
  config_json jsonb not null default '{}'::jsonb,
  added_at timestamptz not null default now(),
  unique (project_id, integration_name)
);

create index if not exists idx_project_integrations_project
  on project_integrations (project_id, status);

alter table project_integrations enable row level security;

create policy "No direct client access to project_integrations"
  on project_integrations for all using (false) with check (false);

-- Optional: waitlist for coming-soon integrations
create table if not exists integration_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, integration_name)
);

alter table integration_waitlist enable row level security;

create policy "Users manage own integration waitlist"
  on integration_waitlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- metadata_logs: integration tracking
alter table metadata_logs
  add column if not exists integration_type text,
  add column if not exists credits_used numeric default 0;

create index if not exists idx_metadata_logs_integration_type
  on metadata_logs (integration_type)
  where integration_type is not null;

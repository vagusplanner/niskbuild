-- Multi-tenant white-label app hosting (subdomain + custom domain)
-- Run in Supabase SQL editor

create table if not exists compiled_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  app_type text not null check (app_type in ('webapp', 'mobile', 'game')),
  subdomain_slug text unique,
  custom_production_domain text unique,
  configuration_state jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compiled_apps_subdomain
  on compiled_applications (subdomain_slug)
  where subdomain_slug is not null;

create index if not exists idx_compiled_apps_custom_domain
  on compiled_applications (custom_production_domain)
  where custom_production_domain is not null;

create index if not exists idx_compiled_apps_owner
  on compiled_applications (owner_id);

alter table compiled_applications enable row level security;

create policy "No direct client access to compiled_applications"
  on compiled_applications for all using (false) with check (false);

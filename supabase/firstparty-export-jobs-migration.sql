-- First-party native export jobs + App Store checklist fields on app_registry
-- Run in Supabase SQL Editor after firstparty-marketplace-layers-migration.sql

create schema if not exists firstparty;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'export_job_status' and n.nspname = 'firstparty'
  ) then
    create type firstparty.export_job_status as enum (
      'building',
      'syncing',
      'ready_for_xcode',
      'failed'
    );
  end if;
end $$;

-- App Store checklist metadata (additive columns on app_registry)
alter table firstparty.app_registry
  add column if not exists app_slug text,
  add column if not exists bundle_id text,
  add column if not exists app_icon_url text,
  add column if not exists privacy_policy_url text,
  add column if not exists app_store_screenshots jsonb not null default '[]'::jsonb;

create unique index if not exists idx_firstparty_app_registry_slug
  on firstparty.app_registry (app_slug)
  where app_slug is not null;

update firstparty.app_registry
set
  app_slug = 'vagus-planner',
  bundle_id = coalesce(bundle_id, 'com.niskbuild.vagusplanner')
where app_name = 'Vagus Planner'
  and app_slug is null;

create table if not exists firstparty.export_jobs (
  id uuid primary key default gen_random_uuid(),
  app_registry_id uuid references firstparty.app_registry(id) on delete set null,
  app_slug text not null,
  requested_by uuid references auth.users(id) on delete set null,
  status firstparty.export_job_status not null default 'building',
  log text not null default '',
  capacitor_root text,
  ios_workspace text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_firstparty_export_jobs_slug_started
  on firstparty.export_jobs (app_slug, started_at desc);
create index if not exists idx_firstparty_export_jobs_requester
  on firstparty.export_jobs (requested_by, started_at desc);

alter table firstparty.export_jobs enable row level security;

drop policy if exists "Platform owners manage export_jobs" on firstparty.export_jobs;
create policy "Platform owners manage export_jobs"
  on firstparty.export_jobs for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

drop policy if exists "Requesters read own export_jobs" on firstparty.export_jobs;
create policy "Requesters read own export_jobs"
  on firstparty.export_jobs for select
  to authenticated
  using (requested_by = auth.uid() or public.is_platform_owner());

drop policy if exists "Requesters insert own export_jobs" on firstparty.export_jobs;
create policy "Requesters insert own export_jobs"
  on firstparty.export_jobs for insert
  to authenticated
  with check (requested_by = auth.uid() or public.is_platform_owner());

drop policy if exists "Requesters update own export_jobs" on firstparty.export_jobs;
create policy "Requesters update own export_jobs"
  on firstparty.export_jobs for update
  to authenticated
  using (requested_by = auth.uid() or public.is_platform_owner())
  with check (requested_by = auth.uid() or public.is_platform_owner());

grant select, insert, update on firstparty.export_jobs to authenticated, service_role;

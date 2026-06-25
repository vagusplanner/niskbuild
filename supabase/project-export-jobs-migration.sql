-- Subscriber mobile export pipeline
-- 1. App Store readiness columns on public.projects
-- 2. Job tracking table public.project_export_jobs
-- Run in Supabase SQL Editor (additive only)

alter table public.projects
  add column if not exists bundle_id text,
  add column if not exists icon_url text,
  add column if not exists privacy_policy_url text,
  add column if not exists export_status text not null default 'not_started';

create unique index if not exists idx_projects_bundle_id_unique
  on public.projects (bundle_id)
  where bundle_id is not null;

create table if not exists public.project_export_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'building', 'syncing', 'ready', 'failed')),
  log text not null default '',
  download_url text,
  capacitor_root text,
  ios_workspace text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_project_export_jobs_project_started
  on public.project_export_jobs (project_id, started_at desc);

create index if not exists idx_project_export_jobs_user_started
  on public.project_export_jobs (user_id, started_at desc);

create index if not exists idx_project_export_jobs_status
  on public.project_export_jobs (status, started_at desc);

alter table public.project_export_jobs enable row level security;

drop policy if exists "Users read own project export jobs" on public.project_export_jobs;
create policy "Users read own project export jobs"
  on public.project_export_jobs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users insert own project export jobs" on public.project_export_jobs;
create policy "Users insert own project export jobs"
  on public.project_export_jobs for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users update own project export jobs" on public.project_export_jobs;
create policy "Users update own project export jobs"
  on public.project_export_jobs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.project_export_jobs to authenticated, service_role;

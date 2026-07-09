-- Multi-page project file map persistence
-- Run in Supabase SQL editor. Additive only — existing rows keep NULL files_json
-- and continue to load as single-page (generated_code → index.html).

alter table public.projects
  add column if not exists files_json jsonb;

alter table public.project_versions
  add column if not exists files_json jsonb;

comment on column public.projects.files_json is
  'Full project file map: { "index.html": "...", "pages/contact.html": "...", ... }. NULL = legacy single-file project.';

comment on column public.project_versions.files_json is
  'Snapshot of full project file map at this version. NULL = legacy single-file snapshot.';

create index if not exists idx_projects_files_json
  on public.projects using gin (files_json)
  where files_json is not null;

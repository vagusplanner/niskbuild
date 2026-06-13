-- Google Places business import on projects + metadata tracking
-- Run in Supabase SQL editor

alter table projects
  add column if not exists project_context jsonb;

create index if not exists idx_projects_project_context
  on projects using gin (project_context)
  where project_context is not null;

alter table metadata_logs
  add column if not exists import_type text;

create index if not exists idx_metadata_logs_import_type
  on metadata_logs (import_type)
  where import_type is not null;

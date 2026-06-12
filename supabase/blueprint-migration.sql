-- Blueprint JSON storage on saved projects
-- Run in Supabase SQL editor

alter table projects
  add column if not exists blueprint_json jsonb;

create index if not exists idx_projects_blueprint_json
  on projects using gin (blueprint_json);

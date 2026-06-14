-- Prompt 10: project version history

create table if not exists project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version_number integer not null,
  blueprint_json jsonb,
  generated_code text not null,
  prompt_used text default '',
  credits_used decimal(10, 2) default 0,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index if not exists idx_project_versions_project
  on project_versions (project_id, version_number desc);

alter table project_versions enable row level security;

create policy "Users read own project versions"
  on project_versions for select
  using (
    exists (
      select 1 from projects
      where projects.id = project_versions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users insert own project versions"
  on project_versions for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = project_versions.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users delete own project versions"
  on project_versions for delete
  using (
    exists (
      select 1 from projects
      where projects.id = project_versions.project_id
        and projects.user_id = auth.uid()
    )
  );

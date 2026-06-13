-- SEO settings per saved project (Prompt 7)

create table if not exists project_seo (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  title text default '',
  meta_description text default '',
  focus_keyword text default '',
  canonical_url text default '',
  og_title text default '',
  og_description text default '',
  og_image_url text default '',
  schema_type text default 'saas',
  schema_json jsonb,
  noindex boolean not null default false,
  sitemap_enabled boolean not null default true,
  robots_enabled boolean not null default true,
  seo_score integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_seo_project on project_seo (project_id);

alter table project_seo enable row level security;

create policy "Users read own project seo"
  on project_seo for select
  using (
    exists (
      select 1 from projects
      where projects.id = project_seo.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users insert own project seo"
  on project_seo for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = project_seo.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users update own project seo"
  on project_seo for update
  using (
    exists (
      select 1 from projects
      where projects.id = project_seo.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Users delete own project seo"
  on project_seo for delete
  using (
    exists (
      select 1 from projects
      where projects.id = project_seo.project_id
        and projects.user_id = auth.uid()
    )
  );

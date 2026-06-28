-- NiskBuild platform storage: imported-apps + project-exports buckets
-- Prerequisite: firstparty-marketplace-layers-migration.sql (is_platform_owner + platform_owners)
-- Run in Supabase SQL Editor

-- imported-apps: normalized ZIP + manifest per slug
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imported-apps',
  'imported-apps',
  false,
  1073741824,
  array['application/zip', 'application/json', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- project-exports: subscriber native export ZIPs (dist bundle)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-exports',
  'project-exports',
  false,
  524288000,
  array['application/zip']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS: mirror public.is_platform_owner() body verbatim (storage policies cannot rely on ad-hoc subqueries)
--   select exists (select 1 from firstparty.platform_owners po where po.user_id = auth.uid())

drop policy if exists "Platform owners manage imported-apps objects" on storage.objects;
create policy "Platform owners manage imported-apps objects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'imported-apps'
    and exists (
      select 1
      from firstparty.platform_owners po
      where po.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'imported-apps'
    and exists (
      select 1
      from firstparty.platform_owners po
      where po.user_id = auth.uid()
    )
  );

drop policy if exists "Users read own project-exports objects" on storage.objects;
create policy "Users read own project-exports objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'project-exports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Platform owners manage project-exports objects" on storage.objects;
create policy "Platform owners manage project-exports objects"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from firstparty.platform_owners po
      where po.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from firstparty.platform_owners po
      where po.user_id = auth.uid()
    )
  );

-- Export jobs: storage path + ready_zip_only status
alter table public.project_export_jobs
  add column if not exists storage_path text;

alter table public.project_export_jobs
  drop constraint if exists project_export_jobs_status_check;

alter table public.project_export_jobs
  add constraint project_export_jobs_status_check
  check (status in ('pending', 'building', 'syncing', 'ready', 'ready_zip_only', 'failed'));

create index if not exists idx_project_export_jobs_storage_path
  on public.project_export_jobs (storage_path)
  where storage_path is not null;

-- Import records: storage path (canonical location; workspace_path is legacy display)
alter table firstparty.app_imports
  add column if not exists storage_path text;

comment on column firstparty.app_imports.storage_path is
  'Object prefix in imported-apps bucket, e.g. my-app/source.zip';

create index if not exists idx_firstparty_app_imports_storage_path
  on firstparty.app_imports (storage_path)
  where storage_path is not null;

-- Prebuilt VP node_modules artifacts for web Deploy (avoids npm ci on every click).
-- Prerequisite: firstparty-marketplace-layers-migration.sql (is_platform_owner).
-- Run in Supabase SQL editor.

-- Private bucket (service role only; deploy API downloads via admin client)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vp-deploy-artifacts',
  'vp-deploy-artifacts',
  false,
  314572800,
  array[
    'application/gzip',
    'application/x-gzip',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Platform-level manifest (not per-tenant)
create table if not exists firstparty.vp_deploy_artifacts (
  lockfile_hash text primary key,
  storage_path text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

comment on table firstparty.vp_deploy_artifacts is
  'Manifest of prebuilt apps/vagus-planner node_modules archives keyed by package-lock.json hash.';

create index if not exists idx_vp_deploy_artifacts_created
  on firstparty.vp_deploy_artifacts (created_at desc);

alter table firstparty.vp_deploy_artifacts enable row level security;

drop policy if exists "Platform owners read vp_deploy_artifacts"
  on firstparty.vp_deploy_artifacts;
create policy "Platform owners read vp_deploy_artifacts"
  on firstparty.vp_deploy_artifacts for select
  using (public.is_platform_owner());

drop policy if exists "Platform owners write vp_deploy_artifacts"
  on firstparty.vp_deploy_artifacts;
create policy "Platform owners write vp_deploy_artifacts"
  on firstparty.vp_deploy_artifacts for all
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

grant select on firstparty.vp_deploy_artifacts to authenticated;
grant all on firstparty.vp_deploy_artifacts to service_role;

-- Storage: no public access; service role bypasses RLS for deploy downloads
drop policy if exists "No public access vp-deploy-artifacts"
  on storage.objects;
create policy "No public access vp-deploy-artifacts"
  on storage.objects for all
  using (bucket_id = 'vp-deploy-artifacts' and false)
  with check (bucket_id = 'vp-deploy-artifacts' and false);

-- Generic external app import pipeline (ZIP ingestion)
-- Prerequisite: firstparty-marketplace-layers-migration.sql
-- Run in Supabase SQL Editor

create schema if not exists firstparty;

create table if not exists firstparty.app_imports (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  status text not null default 'pending'
    check (status in ('pending', 'extracting', 'normalizing', 'completed', 'failed')),
  source_layer text not null default 'subscriber'
    check (source_layer in ('firstparty', 'subscriber')),
  framework text,
  workspace_path text not null,
  listing_id uuid references marketplace.listings(id) on delete set null,
  app_registry_id uuid references firstparty.app_registry(id) on delete set null,
  imported_by uuid not null references auth.users(id) on delete cascade,
  manifest jsonb not null default '{}'::jsonb,
  log text not null default '',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint app_imports_slug_unique unique (slug)
);

create index if not exists idx_firstparty_app_imports_status
  on firstparty.app_imports (status, created_at desc);

create index if not exists idx_firstparty_app_imports_importer
  on firstparty.app_imports (imported_by, created_at desc);

alter table firstparty.app_imports enable row level security;

drop policy if exists "Platform owners manage app_imports" on firstparty.app_imports;
create policy "Platform owners manage app_imports"
  on firstparty.app_imports for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

drop policy if exists "Importers read own app_imports" on firstparty.app_imports;
create policy "Importers read own app_imports"
  on firstparty.app_imports for select
  to authenticated
  using (imported_by = auth.uid() or public.is_platform_owner());

grant select, insert, update on firstparty.app_imports to authenticated, service_role;

comment on table firstparty.app_imports is
  'Tracks ZIP/repository ingestion through the external app import pipeline.';

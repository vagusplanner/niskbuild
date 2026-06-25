-- Add edition column for Standard / Islamic toggle (Account → Settings)
-- Run in Supabase SQL editor after firstparty-marketplace-layers-migration.sql

-- Ensure base columns exist on older vp_user_settings tables
alter table firstparty.vp_user_settings
  add column if not exists preferences jsonb not null default '{}'::jsonb,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists edition text not null default 'standard';

comment on column firstparty.vp_user_settings.edition is
  'App edition: standard | islamic';

-- Backfill from preferences JSON when present
update firstparty.vp_user_settings
set edition = coalesce(preferences->>'edition', 'standard')
where edition = 'standard'
  and preferences ? 'edition'
  and preferences->>'edition' in ('standard', 'islamic');

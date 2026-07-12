-- Company social posting via Buffer personal API key (admin-only)
-- Prerequisite: buffer-social-hub-migration.sql

alter table firstparty.social_hub_config
  add column if not exists last_company_post_at timestamptz;

comment on column firstparty.social_hub_config.last_company_post_at is
  'Last time NiskBuild company posted via BUFFER_PERSONAL_API_KEY (admin composer)';

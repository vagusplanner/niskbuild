-- SSO (SAML) v1 for Team Enterprise / Sovereign organizations
-- Prerequisite: organizations-phase1-migration.sql; Supabase Auth SAML enabled on project

alter table public.organizations
  add column if not exists sso_provider_id uuid,
  add column if not exists sso_domain text,
  add column if not exists sso_enabled boolean not null default false;

comment on column public.organizations.sso_provider_id is
  'Supabase Auth SSO provider UUID from POST /auth/v1/admin/sso/providers';
comment on column public.organizations.sso_domain is
  'Company email domain (lowercase) for SP-initiated SSO, e.g. acme.com';
comment on column public.organizations.sso_enabled is
  'When true, Sign in with SSO routes matching emails to this org IdP';

-- One enabled SSO domain globally (Supabase also enforces domain uniqueness per project)
create unique index if not exists organizations_sso_domain_unique
  on public.organizations (lower(sso_domain))
  where sso_domain is not null and sso_enabled = true;

create index if not exists idx_organizations_sso_provider
  on public.organizations (sso_provider_id)
  where sso_provider_id is not null;

-- White-label Phase 0 + Phase 1: branding columns, custom_domains.org_id, backfills
-- Prerequisites: organizations-phase1-migration.sql, custom-domains-migration.sql

-- ═══════════════════════════════════════════════════════════════════
-- organizations branding columns
-- ═══════════════════════════════════════════════════════════════════

alter table public.organizations
  add column if not exists brand_app_name text,
  add column if not exists brand_logo_url text,
  add column if not exists hide_niskbuild_attribution boolean not null default false;

comment on column public.organizations.brand_app_name is
  'Customer-facing app name on custom domains (White-Label+). Null = use org name or NiskBuild fallbacks.';
comment on column public.organizations.brand_logo_url is
  'Public logo URL for custom-domain chrome (White-Label+).';
comment on column public.organizations.hide_niskbuild_attribution is
  'Preference to hide Powered-by on custom domains. Only effective when billing owner is White-Label+.';

-- Option B: existing White-Label+ owners start with attribution removed
update public.organizations o
set hide_niskbuild_attribution = true
from public.profiles p
where o.billing_owner_id = p.id
  and coalesce(p.subscription_tier, 'free') in ('white_label', 'team_enterprise', 'sovereign')
  and coalesce(p.subscription_status, 'inactive') in ('active', 'past_due');

-- ═══════════════════════════════════════════════════════════════════
-- custom_domains.org_id
-- ═══════════════════════════════════════════════════════════════════

alter table public.custom_domains
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_custom_domains_org_id
  on public.custom_domains (org_id)
  where org_id is not null;

comment on column public.custom_domains.org_id is
  'Owning organization for white-label brand resolution (hostname → org branding).';

-- Backfill: owner's billing org (prefer oldest if multiple)
update public.custom_domains cd
set org_id = sub.org_id
from (
  select distinct on (o.billing_owner_id)
    o.billing_owner_id,
    o.id as org_id
  from public.organizations o
  order by o.billing_owner_id, o.created_at asc
) sub
where cd.org_id is null
  and cd.owner_id = sub.billing_owner_id;

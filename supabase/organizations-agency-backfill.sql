-- Multi-seat teams Phase 1: one-time solo-org backfill for active Agency+ billing owners
--
-- Prerequisites: organizations-phase1-migration.sql already applied.
--
-- STEP 1 — DRY RUN (run this first; do not skip):
-- Reports how many Agency+ profiles would get a solo org (excludes anyone who
-- already owns an organization as billing_owner_id).

select
  count(*)::int as would_create_orgs,
  array_agg(p.id order by p.email) filter (where true) as sample_user_ids
from public.profiles p
where coalesce(p.subscription_tier, 'free') in (
    'agency',
    'scale',
    'white_label',
    'team_enterprise',
    'sovereign'
  )
  and coalesce(p.subscription_status, 'inactive') in ('active', 'past_due')
  and not exists (
    select 1
    from public.organizations o
    where o.billing_owner_id = p.id
  );

-- Optional detail list:
-- select p.id, p.email, p.subscription_tier, p.subscription_status
-- from public.profiles p
-- where ... same filters ...
-- order by p.email;

-- STEP 2 — APPLY (only after reviewing the dry-run count):
-- Idempotent: skips users who already have an org as billing owner.

with eligible as (
  select
    p.id as user_id,
    coalesce(
      nullif(trim(split_part(coalesce(p.email, ''), '@', 1)), ''),
      'Personal'
    ) || ' workspace' as org_name
  from public.profiles p
  where coalesce(p.subscription_tier, 'free') in (
      'agency',
      'scale',
      'white_label',
      'team_enterprise',
      'sovereign'
    )
    and coalesce(p.subscription_status, 'inactive') in ('active', 'past_due')
    and not exists (
      select 1
      from public.organizations o
      where o.billing_owner_id = p.id
    )
),
created_orgs as (
  insert into public.organizations (name, billing_owner_id)
  select e.org_name, e.user_id
  from eligible e
  returning id, billing_owner_id
)
insert into public.organization_members (org_id, user_id, role)
select c.id, c.billing_owner_id, 'owner'
from created_orgs c;

-- Verification:
-- select count(*) from organizations;
-- select count(*) from organization_members where role = 'owner';

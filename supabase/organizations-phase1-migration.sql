-- Multi-seat teams Phase 1: organizations foundation (schema + RLS only)
-- No UI. Existing projects stay personal (org_id NULL).
-- Prerequisite: public.profiles, public.projects, public.is_platform_owner()
--
-- After this file, run organizations-agency-backfill.sql (dry-run count first).

-- ═══════════════════════════════════════════════════════════════════
-- organizations
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_billing_owner
  on public.organizations (billing_owner_id);

comment on table public.organizations is
  'Team/org container. Billing stays on billing_owner_id profile (Stripe). Phase 1 solo orgs for Agency+.';

create or replace function public.set_organizations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row
  execute function public.set_organizations_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- organization_members
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  constraint organization_members_org_user_unique unique (org_id, user_id)
);

create index if not exists idx_organization_members_user
  on public.organization_members (user_id);

create index if not exists idx_organization_members_org
  on public.organization_members (org_id);

-- Exactly one owner membership per organization
create unique index if not exists organization_members_one_owner_per_org
  on public.organization_members (org_id)
  where (role = 'owner');

comment on table public.organization_members is
  'Org membership. Agency seat of 3 includes the owner. Invites (Phase 2) insert rows here on accept.';

-- ═══════════════════════════════════════════════════════════════════
-- projects.org_id (nullable; existing rows stay NULL)
-- ═══════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists org_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_projects_org_id
  on public.projects (org_id)
  where org_id is not null;

comment on column public.projects.org_id is
  'NULL = personal project (default). Set when user moves/creates a team project (Phase 2+).';

-- ═══════════════════════════════════════════════════════════════════
-- RLS helpers (SECURITY DEFINER — avoid recursive policy checks)
-- Phase 2 organization_invites should reuse is_org_owner_or_admin(org_id).
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_owner_or_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_org_billing_owner(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_org_id
      and o.billing_owner_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_owner_or_admin(uuid) from public;
revoke all on function public.is_org_billing_owner(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.is_org_owner_or_admin(uuid) to authenticated, service_role;
grant execute on function public.is_org_billing_owner(uuid) to authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════
-- RLS: organizations
-- ═══════════════════════════════════════════════════════════════════

alter table public.organizations enable row level security;

drop policy if exists "Members read own organizations" on public.organizations;
create policy "Members read own organizations"
  on public.organizations for select
  to authenticated
  using (public.is_org_member(id) or public.is_platform_owner());

drop policy if exists "Billing owner insert organizations" on public.organizations;
create policy "Billing owner insert organizations"
  on public.organizations for insert
  to authenticated
  with check (billing_owner_id = auth.uid() or public.is_platform_owner());

drop policy if exists "Owner or admin update organizations" on public.organizations;
create policy "Owner or admin update organizations"
  on public.organizations for update
  to authenticated
  using (public.is_org_owner_or_admin(id) or public.is_platform_owner())
  with check (public.is_org_owner_or_admin(id) or public.is_platform_owner());

drop policy if exists "Billing owner delete organizations" on public.organizations;
create policy "Billing owner delete organizations"
  on public.organizations for delete
  to authenticated
  using (public.is_org_billing_owner(id) or public.is_platform_owner());

-- ═══════════════════════════════════════════════════════════════════
-- RLS: organization_members
-- Members read; owner/admin write (Phase 2 invites will use the same write gate).
-- ═══════════════════════════════════════════════════════════════════

alter table public.organization_members enable row level security;

drop policy if exists "Members read org membership" on public.organization_members;
create policy "Members read org membership"
  on public.organization_members for select
  to authenticated
  using (public.is_org_member(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin insert org members" on public.organization_members;
create policy "Owner or admin insert org members"
  on public.organization_members for insert
  to authenticated
  with check (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin update org members" on public.organization_members;
create policy "Owner or admin update org members"
  on public.organization_members for update
  to authenticated
  using (public.is_org_owner_or_admin(org_id) or public.is_platform_owner())
  with check (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin delete org members" on public.organization_members;
create policy "Owner or admin delete org members"
  on public.organization_members for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;

-- Phase 2 stub (do not create yet):
-- create table organization_invites (... org_id, email, role, token, ...);
-- RLS: select/insert/update/delete using is_org_owner_or_admin(org_id)
-- Accept path uses service role or a narrow SECURITY DEFINER RPC.

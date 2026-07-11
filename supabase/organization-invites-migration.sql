-- Multi-seat teams Phase 2: organization_invites
-- Prerequisite: organizations-phase1-migration.sql

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null
    check (role in ('admin', 'member')),
  token text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_invites_token_unique unique (token)
);

create index if not exists idx_organization_invites_org
  on public.organization_invites (org_id);

create index if not exists idx_organization_invites_email
  on public.organization_invites (lower(email));

create index if not exists idx_organization_invites_pending
  on public.organization_invites (org_id)
  where accepted_at is null and revoked_at is null;

comment on table public.organization_invites is
  'Pending team invites. Seat cap = members + pending (non-expired, non-revoked) invites.';

alter table public.organization_invites enable row level security;

drop policy if exists "Members read org invites" on public.organization_invites;
create policy "Members read org invites"
  on public.organization_invites for select
  to authenticated
  using (public.is_org_member(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin insert org invites" on public.organization_invites;
create policy "Owner or admin insert org invites"
  on public.organization_invites for insert
  to authenticated
  with check (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin update org invites" on public.organization_invites;
create policy "Owner or admin update org invites"
  on public.organization_invites for update
  to authenticated
  using (public.is_org_owner_or_admin(org_id) or public.is_platform_owner())
  with check (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

drop policy if exists "Owner or admin delete org invites" on public.organization_invites;
create policy "Owner or admin delete org invites"
  on public.organization_invites for delete
  to authenticated
  using (public.is_org_owner_or_admin(org_id) or public.is_platform_owner());

grant select, insert, update, delete on public.organization_invites to authenticated;

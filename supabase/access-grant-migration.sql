-- Admin-comped product access (DB-only grants; no Stripe).
-- Additive only. Apply in Supabase SQL Editor (project pattern).

alter table public.profiles
  add column if not exists access_grant text not null default 'none',
  add column if not exists access_grant_tier text,
  add column if not exists access_grant_notes text,
  add column if not exists access_grant_granted_by text,
  add column if not exists access_grant_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_access_grant_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_access_grant_check
      check (access_grant in ('none', 'admin_comped'));
  end if;
end $$;

comment on column public.profiles.access_grant is
  'none | admin_comped — complimentary product access granted by platform owner (no Stripe)';
comment on column public.profiles.access_grant_tier is
  'NiskBuild tier slug used for product gating while access_grant = admin_comped';
comment on column public.profiles.access_grant_notes is
  'Optional admin notes for the complementary grant';
comment on column public.profiles.access_grant_granted_by is
  'Admin email / label that granted complementary access';
comment on column public.profiles.access_grant_expires_at is
  'Optional expiry; null means no expiry. Expired grants are treated as none.';

create index if not exists idx_profiles_access_grant_active
  on public.profiles (access_grant, access_grant_expires_at)
  where access_grant = 'admin_comped';

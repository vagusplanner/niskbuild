-- Self-serve custom domains (White-Label+)
-- Run in Supabase SQL editor after compiled-applications-migration.sql

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  hostname text not null,
  verification_token text not null,
  -- pending_dns: awaiting TXT
  -- dns_verified: TXT ok; may still need Vercel/SSL attach
  -- active: DNS verified and ready for routing (Vercel attached when configured)
  -- failed: last verify attempt failed (still pending until success)
  status text not null default 'pending_dns'
    check (status in ('pending_dns', 'dns_verified', 'active', 'failed')),
  compiled_application_id uuid references public.compiled_applications(id) on delete set null,
  vercel_attached boolean not null default false,
  last_error text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_domains_hostname_unique unique (hostname)
);

create index if not exists idx_custom_domains_owner
  on public.custom_domains (owner_id);

create index if not exists idx_custom_domains_status
  on public.custom_domains (status);

create index if not exists idx_custom_domains_hostname_active
  on public.custom_domains (hostname)
  where status in ('dns_verified', 'active');

create or replace function public.set_custom_domains_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_custom_domains_updated_at on public.custom_domains;
create trigger trg_custom_domains_updated_at
  before update on public.custom_domains
  for each row
  execute function public.set_custom_domains_updated_at();

alter table public.custom_domains enable row level security;

-- Owners can read their own rows (writes go through service-role API)
drop policy if exists "Owners read own custom domains" on public.custom_domains;
create policy "Owners read own custom domains"
  on public.custom_domains for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Platform owners read all custom domains" on public.custom_domains;
create policy "Platform owners read all custom domains"
  on public.custom_domains for select
  to authenticated
  using (public.is_platform_owner());

grant select on public.custom_domains to authenticated;

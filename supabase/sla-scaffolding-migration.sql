-- SLA / enterprise scaffolding (observational only — no enforcement)
-- Prerequisite: support-tickets-migration.sql, organizations-phase1-migration.sql

-- 1) Time-to-first-response on support tickets
alter table public.support_tickets
  add column if not exists first_response_at timestamptz;

comment on column public.support_tickets.first_response_at is
  'Set when an admin/support first replies; observational TTFR only';

-- Backfill from earliest admin message where missing
update public.support_tickets t
set first_response_at = m.first_admin_at
from (
  select ticket_id, min(created_at) as first_admin_at
  from public.support_messages
  where sender_type = 'admin'
  group by ticket_id
) m
where t.id = m.ticket_id
  and t.first_response_at is null;

-- 2) Manual public status page (no automated uptime monitoring)
create table if not exists public.platform_status (
  id integer primary key default 1 check (id = 1),
  status text not null default 'operational'
    check (status in ('operational', 'degraded', 'down')),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.platform_status (id, status)
values (1, 'operational')
on conflict (id) do nothing;

create table if not exists public.status_updates (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists idx_status_updates_created
  on public.status_updates (created_at desc);

alter table public.platform_status enable row level security;
alter table public.status_updates enable row level security;

-- Public read (status page); writes only via service role / admin API
drop policy if exists "Anyone can read platform status" on public.platform_status;
create policy "Anyone can read platform status"
  on public.platform_status for select
  using (true);

drop policy if exists "Anyone can read status updates" on public.status_updates;
create policy "Anyone can read status updates"
  on public.status_updates for select
  using (true);

grant select on public.platform_status to anon, authenticated;
grant select on public.status_updates to anon, authenticated;

-- 3) Dedicated infrastructure interest (demand signal only)
alter table public.organizations
  add column if not exists dedicated_infra_interest boolean not null default false,
  add column if not exists dedicated_infra_notes text;

comment on column public.organizations.dedicated_infra_interest is
  'Admin flag: prospect/customer expressed interest in dedicated infrastructure';
comment on column public.organizations.dedicated_infra_notes is
  'Optional internal note about dedicated infra interest (not customer-facing)';

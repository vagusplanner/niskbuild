-- Three-layer database foundation: firstparty + marketplace schemas
-- Run in Supabase SQL editor. Purely additive — does NOT alter public subscriber tables.
-- After running: Supabase Dashboard → Settings → API → expose schemas: public, firstparty, marketplace

-- ═══════════════════════════════════════════════════════════════════
-- Shared platform-owner gate (additive public function; no table changes)
-- ═══════════════════════════════════════════════════════════════════

create schema if not exists firstparty;
create schema if not exists marketplace;

create table if not exists firstparty.platform_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table firstparty.platform_owners is
  'Allowlist of NiskBuild platform owner user ids for admin RLS across firstparty/marketplace.';

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, firstparty
as $$
  select exists (
    select 1
    from firstparty.platform_owners po
    where po.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_owner() from public;
grant execute on function public.is_platform_owner() to authenticated, service_role;

-- Register yourself once (replace email if needed):
-- insert into firstparty.platform_owners (user_id)
-- select id from auth.users where lower(email) = lower('sofiane.kemih@gmail.com')
-- on conflict (user_id) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- firstparty — apps you own and build with NiskBuild tooling
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.app_registry (
  id uuid primary key default gen_random_uuid(),
  app_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  constraint app_registry_app_name_unique unique (app_name)
);

create index if not exists idx_firstparty_app_registry_status
  on firstparty.app_registry (status, created_at desc);

create table if not exists firstparty.vp_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#C9884A',
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_vp_categories_user
  on firstparty.vp_categories (user_id, sort_order);

create table if not exists firstparty.vp_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references firstparty.vp_categories(id) on delete set null,
  title text not null,
  notes text,
  priority smallint not null default 0 check (priority between 0 and 3),
  due_date timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'in_progress', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_vp_tasks_user_due
  on firstparty.vp_tasks (user_id, due_date nulls last);
create index if not exists idx_firstparty_vp_tasks_user_completed
  on firstparty.vp_tasks (user_id, completed_at nulls first);

create table if not exists firstparty.vp_user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_user_settings_user_unique unique (user_id)
);

create table if not exists firstparty.vp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  event_date timestamptz,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firstparty_vp_events_user_date
  on firstparty.vp_events (user_id, event_date nulls last);

-- Seed Vagus Planner registry row (idempotent)
insert into firstparty.app_registry (app_name, status)
values ('Vagus Planner', 'active')
on conflict (app_name) do update set status = excluded.status;

-- RLS — firstparty
alter table firstparty.platform_owners enable row level security;
alter table firstparty.app_registry enable row level security;
alter table firstparty.vp_categories enable row level security;
alter table firstparty.vp_tasks enable row level security;
alter table firstparty.vp_user_settings enable row level security;
alter table firstparty.vp_events enable row level security;

create policy "Platform owners manage platform_owners"
  on firstparty.platform_owners for all
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create policy "Authenticated read active first-party apps"
  on firstparty.app_registry for select
  to authenticated
  using (status = 'active' or public.is_platform_owner());

create policy "Platform owners manage app registry"
  on firstparty.app_registry for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create policy "Users manage own vp_categories"
  on firstparty.vp_categories for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

create policy "Users manage own vp_tasks"
  on firstparty.vp_tasks for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

create policy "Users manage own vp_user_settings"
  on firstparty.vp_user_settings for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

create policy "Users manage own vp_events"
  on firstparty.vp_events for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

-- ═══════════════════════════════════════════════════════════════════
-- marketplace — app delivery, sales, and export workflow
-- ═══════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'listing_type' and n.nspname = 'marketplace') then
    create type marketplace.listing_type as enum ('template', 'ready_made', 'commission');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'export_job_status' and n.nspname = 'marketplace') then
    create type marketplace.export_job_status as enum (
      'requested', 'in_progress', 'submitted', 'approved', 'rejected'
    );
  end if;
end $$;

create table if not exists marketplace.listings (
  id uuid primary key default gen_random_uuid(),
  app_source jsonb not null,
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  listing_type marketplace.listing_type not null default 'template',
  seller_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_app_source_shape check (
    app_source ? 'layer'
    and app_source->>'layer' in ('firstparty', 'subscriber')
  )
);

create index if not exists idx_marketplace_listings_active
  on marketplace.listings (is_active, listing_type, created_at desc);
create index if not exists idx_marketplace_listings_seller
  on marketplace.listings (seller_user_id, created_at desc);

create table if not exists marketplace.purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace.listings(id) on delete restrict,
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_id text,
  cloned_project_id uuid,
  purchased_at timestamptz not null default now()
);

create index if not exists idx_marketplace_purchases_buyer
  on marketplace.purchases (buyer_user_id, purchased_at desc);
create index if not exists idx_marketplace_purchases_listing
  on marketplace.purchases (listing_id, purchased_at desc);
create index if not exists idx_marketplace_purchases_month
  on marketplace.purchases (purchased_at desc);

create table if not exists marketplace.export_jobs (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  app_reference jsonb not null,
  status marketplace.export_job_status not null default 'requested',
  fee_cents integer not null default 0 check (fee_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_export_jobs_requester
  on marketplace.export_jobs (requester_user_id, created_at desc);
create index if not exists idx_marketplace_export_jobs_status
  on marketplace.export_jobs (status, updated_at desc);

-- RLS — marketplace
alter table marketplace.listings enable row level security;
alter table marketplace.purchases enable row level security;
alter table marketplace.export_jobs enable row level security;

create policy "Authenticated read active marketplace listings"
  on marketplace.listings for select
  to authenticated
  using (
    is_active = true
    or seller_user_id = auth.uid()
    or public.is_platform_owner()
  );

create policy "Sellers and platform owners manage listings"
  on marketplace.listings for all
  to authenticated
  using (seller_user_id = auth.uid() or public.is_platform_owner())
  with check (seller_user_id = auth.uid() or public.is_platform_owner());

create policy "Buyers read own purchases"
  on marketplace.purchases for select
  to authenticated
  using (buyer_user_id = auth.uid() or public.is_platform_owner());

create policy "Buyers create own purchases"
  on marketplace.purchases for insert
  to authenticated
  with check (buyer_user_id = auth.uid() or public.is_platform_owner());

create policy "Platform owners manage purchases"
  on marketplace.purchases for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

create policy "Requesters manage own export jobs"
  on marketplace.export_jobs for all
  to authenticated
  using (requester_user_id = auth.uid() or public.is_platform_owner())
  with check (requester_user_id = auth.uid() or public.is_platform_owner());

-- Admin aggregate helper (service role / platform owner dashboards)
create or replace function marketplace.sales_total_cents_this_month()
returns bigint
language sql
stable
security definer
set search_path = marketplace, public
as $$
  select coalesce(sum(l.price_cents), 0)::bigint
  from marketplace.purchases p
  join marketplace.listings l on l.id = p.listing_id
  where p.purchased_at >= date_trunc('month', now() at time zone 'utc');
$$;

revoke all on function marketplace.sales_total_cents_this_month() from public;
grant execute on function marketplace.sales_total_cents_this_month() to service_role, authenticated;

-- Grants for Supabase API roles
grant usage on schema firstparty to authenticated, service_role;
grant usage on schema marketplace to authenticated, service_role;

grant select, insert, update, delete on all tables in schema firstparty to authenticated, service_role;
grant select, insert, update, delete on all tables in schema marketplace to authenticated, service_role;

grant usage, select on all sequences in schema firstparty to authenticated, service_role;
grant usage, select on all sequences in schema marketplace to authenticated, service_role;

alter default privileges in schema firstparty
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema marketplace
  grant select, insert, update, delete on tables to authenticated, service_role;

-- Rename due_at → due_date if upgrading from an earlier migration version
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'firstparty'
      and table_name = 'vp_tasks'
      and column_name = 'due_at'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'firstparty'
      and table_name = 'vp_tasks'
      and column_name = 'due_date'
  ) then
    alter table firstparty.vp_tasks rename column due_at to due_date;
  end if;
end $$;

-- Add status column if upgrading from schema without it
alter table firstparty.vp_tasks
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vp_tasks_status_check'
      and conrelid = 'firstparty.vp_tasks'::regclass
  ) then
    alter table firstparty.vp_tasks
      add constraint vp_tasks_status_check
      check (status in ('pending', 'completed', 'in_progress', 'cancelled'));
  end if;
end $$;

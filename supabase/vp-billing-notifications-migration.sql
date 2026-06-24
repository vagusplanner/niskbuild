-- Vagus Planner: billing, usage, and notification tables (firstparty schema)
-- Run in Supabase SQL Editor. Purely additive — does NOT alter existing tables.
-- Prerequisite: firstparty schema + public.is_platform_owner() from firstparty-marketplace-layers-migration.sql

create schema if not exists firstparty;

-- ═══════════════════════════════════════════════════════════════════
-- Notification preferences
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  advance_notice_minutes integer not null default 30,
  channels jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_notification_preferences_user_type_unique
    unique (user_id, notification_type)
);

create index if not exists idx_vp_notification_preferences_user
  on firstparty.vp_notification_preferences (user_id, notification_type);

-- ═══════════════════════════════════════════════════════════════════
-- In-app notifications
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  type text not null,
  title text not null,
  message text,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  icon text,
  entity_type text,
  entity_id text,
  is_read boolean not null default false,
  dismissed boolean not null default false,
  scheduled_for timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_notifications_user_created
  on firstparty.vp_notifications (user_id, created_at desc);
create index if not exists idx_vp_notifications_recipient_unread
  on firstparty.vp_notifications (recipient_email, is_read, dismissed);

-- ═══════════════════════════════════════════════════════════════════
-- Subscriptions
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  plan text not null default 'free',
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'paused')),
  price_per_month numeric(10, 2),
  billing_cycle text default 'monthly'
    check (billing_cycle in ('monthly', 'yearly')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  canceled_at timestamptz,
  auto_renew boolean not null default true,
  payment_method_id text,
  payment_retry_count integer not null default 0,
  discount_percent numeric(5, 2),
  discount_applied_at timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_subscriptions_user
  on firstparty.vp_subscriptions (user_id, created_at desc);
create index if not exists idx_vp_subscriptions_email
  on firstparty.vp_subscriptions (lower(user_email));

-- ═══════════════════════════════════════════════════════════════════
-- Invoices
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  subscription_id uuid references firstparty.vp_subscriptions(id) on delete set null,
  plan text,
  amount numeric(10, 2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible', 'refunded')),
  description text,
  issued_date timestamptz not null default now(),
  due_date timestamptz,
  paid_at timestamptz,
  refund_amount numeric(10, 2),
  stripe_invoice_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_invoices_user_issued
  on firstparty.vp_invoices (user_id, issued_date desc);
create index if not exists idx_vp_invoices_email
  on firstparty.vp_invoices (lower(user_email), issued_date desc);

-- ═══════════════════════════════════════════════════════════════════
-- Usage metering
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  feature text not null,
  count numeric not null default 0,
  "limit" numeric not null default 0,
  percentage numeric not null default 0,
  period_start timestamptz not null default date_trunc('month', now() at time zone 'utc'),
  period_end timestamptz not null default (date_trunc('month', now() at time zone 'utc') + interval '1 month'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_usage_user_feature_period_unique
    unique (user_id, feature, period_start)
);

create index if not exists idx_vp_usage_user_period
  on firstparty.vp_usage (user_id, period_start desc);
create index if not exists idx_vp_usage_email_feature
  on firstparty.vp_usage (lower(user_email), feature);

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_notification_preferences enable row level security;
alter table firstparty.vp_notifications enable row level security;
alter table firstparty.vp_subscriptions enable row level security;
alter table firstparty.vp_invoices enable row level security;
alter table firstparty.vp_usage enable row level security;

-- Notification preferences: own rows only
drop policy if exists "Users manage own vp_notification_preferences" on firstparty.vp_notification_preferences;
create policy "Users manage own vp_notification_preferences"
  on firstparty.vp_notification_preferences for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

-- Notifications: match by user_id or recipient_email
drop policy if exists "Users manage own vp_notifications" on firstparty.vp_notifications;
create policy "Users manage own vp_notifications"
  on firstparty.vp_notifications for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  );

-- Subscriptions: match by user_id or user_email
drop policy if exists "Users manage own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users manage own vp_subscriptions"
  on firstparty.vp_subscriptions for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  );

-- Invoices: match by user_id or user_email
drop policy if exists "Users manage own vp_invoices" on firstparty.vp_invoices;
create policy "Users manage own vp_invoices"
  on firstparty.vp_invoices for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  );

-- Usage: match by user_id or user_email
drop policy if exists "Users manage own vp_usage" on firstparty.vp_usage;
create policy "Users manage own vp_usage"
  on firstparty.vp_usage for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
    or public.is_platform_owner()
  );

-- Grants (safe to re-run)
grant usage on schema firstparty to authenticated, service_role;
grant select, insert, update, delete on all tables in schema firstparty to authenticated, service_role;
grant usage, select on all sequences in schema firstparty to authenticated, service_role;

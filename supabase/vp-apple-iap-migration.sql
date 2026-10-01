-- Vagus Planner Apple IAP (RevenueCat) columns on firstparty.vp_subscriptions.
-- Provider-scoped: Apple rows never clear Stripe fields and vice versa.
--
-- Apply in Supabase SQL Editor, or:
--   DATABASE_URL=... npx tsx scripts/evidence-vp-apple-iap.ts

alter table firstparty.vp_subscriptions
  add column if not exists provider text;

-- Backfill existing Stripe-synced rows
update firstparty.vp_subscriptions
set provider = 'stripe'
where provider is null
  and (
    stripe_subscription_id is not null
    or stripe_customer_id is not null
  );

update firstparty.vp_subscriptions
set provider = coalesce(provider, 'stripe')
where provider is null;

alter table firstparty.vp_subscriptions
  alter column provider set default 'stripe';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vp_subscriptions_provider_check'
      and conrelid = 'firstparty.vp_subscriptions'::regclass
  ) then
    alter table firstparty.vp_subscriptions
      add constraint vp_subscriptions_provider_check
      check (provider in ('stripe', 'apple'));
  end if;
end $$;

alter table firstparty.vp_subscriptions
  add column if not exists original_transaction_id text,
  add column if not exists product_id text,
  add column if not exists apple_transaction_id text,
  add column if not exists revenuecat_event_id text,
  add column if not exists store text;

create unique index if not exists idx_vp_subscriptions_apple_original_tx
  on firstparty.vp_subscriptions (original_transaction_id)
  where original_transaction_id is not null;

create index if not exists idx_vp_subscriptions_provider_user
  on firstparty.vp_subscriptions (user_id, provider, created_at desc);

comment on column firstparty.vp_subscriptions.provider is
  'Billing provider: stripe (web/Android) or apple (RevenueCat / App Store).';
comment on column firstparty.vp_subscriptions.original_transaction_id is
  'Apple original transaction id from RevenueCat (idempotent Apple upsert key).';
comment on column firstparty.vp_subscriptions.product_id is
  'Store product identifier (App Store product id).';
comment on column firstparty.vp_subscriptions.apple_transaction_id is
  'Latest Apple transaction id from RevenueCat event.';
comment on column firstparty.vp_subscriptions.revenuecat_event_id is
  'Last processed RevenueCat webhook event id.';

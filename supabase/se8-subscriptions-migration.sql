-- SuperEduc8 billing: app-level trial + Stripe subscription mirror.
-- Does not write to profiles.subscription_tier (shared Stripe account with NiskBuild/VP).

create table if not exists firstparty.se8_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none'
    check (status in (
      'none',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'paused'
    )),
  plan text not null default 'free'
    check (plan in ('free', 'trial', 'student', 'family')),
  interval text
    check (interval is null or interval in ('month', 'year')),
  child_quantity integer not null default 0
    check (child_quantity >= 0),
  multi_curriculum boolean not null default false,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint se8_subscriptions_user_unique unique (user_id)
);

create unique index if not exists idx_se8_subscriptions_stripe_sub
  on firstparty.se8_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_se8_subscriptions_customer
  on firstparty.se8_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_se8_subscriptions_trial_ends
  on firstparty.se8_subscriptions (trial_ends_at)
  where trial_ends_at is not null;

comment on table firstparty.se8_subscriptions is
  'SuperEduc8 Stripe + app-trial billing. Trial is app-level (no card); Stripe status is separate.';

alter table firstparty.se8_subscriptions enable row level security;

drop policy if exists "Users select own se8_subscriptions" on firstparty.se8_subscriptions;
create policy "Users select own se8_subscriptions"
  on firstparty.se8_subscriptions for select
  using (auth.uid() = user_id);

-- Writes are service-role only (signup/consent/webhooks/checkout sync).
revoke all on table firstparty.se8_subscriptions from authenticated;
grant select on table firstparty.se8_subscriptions to authenticated;
grant all on table firstparty.se8_subscriptions to service_role;

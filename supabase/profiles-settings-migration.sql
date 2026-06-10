-- Run in Supabase SQL editor (Phase A launch prerequisites)

alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists openai_api_key text,
  add column if not exists anthropic_api_key text,
  add column if not exists use_own_api_keys boolean default false,
  add column if not exists cloud_credits_remaining integer default 0,
  add column if not exists subscription_id text,
  add column if not exists purchased_templates jsonb default '[]'::jsonb,
  add column if not exists demographic_tier text default 'unspecified',
  add column if not exists telemetry_opt_out boolean default false;

-- Backfill credits for existing paid profiles (run once)
update profiles set cloud_credits_remaining = 600
  where subscription_tier = 'pro' and subscription_status = 'active' and coalesce(cloud_credits_remaining, 0) = 0;

update profiles set cloud_credits_remaining = 2500
  where subscription_tier = 'agency' and subscription_status = 'active' and coalesce(cloud_credits_remaining, 0) = 0;

update profiles set cloud_credits_remaining = 10000
  where subscription_tier = 'scale' and subscription_status = 'active' and coalesce(cloud_credits_remaining, 0) = 0;

update profiles set cloud_credits_remaining = 15000
  where subscription_tier = 'white_label' and subscription_status = 'active' and coalesce(cloud_credits_remaining, 0) = 0;

-- Optional: add to .env.local for full auth user deletion
-- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

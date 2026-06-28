-- Run in Supabase SQL editor: fix users stuck at 0 credits who never built

-- Free tier: 5 trial builds for accounts that never completed a build
update profiles
set
  cloud_credits_remaining = 5,
  credit_alert_80_sent = false,
  credit_alert_100_sent = false
where coalesce(subscription_tier, 'free') = 'free'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

-- Basic tier (was missing from original backfill)
update profiles
set
  cloud_credits_remaining = 150,
  credit_alert_80_sent = false,
  credit_alert_100_sent = false
where subscription_tier = 'basic'
  and subscription_status = 'active'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

-- Pro / Agency / Scale / White-label: same guard for never-built paid users
update profiles
set
  cloud_credits_remaining = 600,
  credit_alert_80_sent = false,
  credit_alert_100_sent = false
where subscription_tier = 'pro'
  and subscription_status = 'active'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

update profiles
set cloud_credits_remaining = 2500
where subscription_tier = 'agency'
  and subscription_status = 'active'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

update profiles
set cloud_credits_remaining = 10000
where subscription_tier = 'scale'
  and subscription_status = 'active'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

update profiles
set cloud_credits_remaining = 15000
where subscription_tier = 'white_label'
  and subscription_status = 'active'
  and coalesce(cloud_credits_remaining, 0) = 0
  and last_build_at is null
  and coalesce(builds_this_period, 0) = 0;

-- Inspect Safora (run separately)
-- select id, email, subscription_tier, subscription_status, cloud_credits_remaining, last_build_at, builds_this_period
-- from profiles where lower(email) = lower('safora.kemih@gmail.com');

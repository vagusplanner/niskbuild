-- Monetization anti-exploit migration (run in Supabase SQL editor)
-- NOTE: Phone verification + session tables are in security-layers-migration.sql

-- Credit alert flags: see retention-conversion-migration.sql (credit_alert_80_sent, credit_alert_100_sent)

-- Disable BYOC for Pro users (Agency+ only)
update profiles
  set use_own_api_keys = false
  where subscription_tier = 'pro' and use_own_api_keys = true;

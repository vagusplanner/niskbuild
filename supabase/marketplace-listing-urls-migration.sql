-- Marketplace listing outbound links (App Store + hosted app)
-- Run in Supabase SQL Editor after firstparty-marketplace-layers-migration.sql

alter table marketplace.listings
  add column if not exists app_store_url text,
  add column if not exists hosted_url text;

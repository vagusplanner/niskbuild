-- Fix ONLY: grant Data API access on an existing public.habits table.
-- Run this in Supabase SQL Editor if you already created habits + RLS but get
-- "permission denied for table habits" (typical when auto-expose is OFF).
-- Does not recreate the table or change policies.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habits to service_role;

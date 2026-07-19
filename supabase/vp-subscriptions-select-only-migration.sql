-- Harden firstparty.vp_subscriptions: clients may SELECT own rows only.
-- Plan/status writes must go through service_role (Stripe webhooks / server handlers).
-- Prevents self-grant of paid Islamic (or any) plans via the Supabase client.
-- Safe to re-run.

alter table firstparty.vp_subscriptions enable row level security;

drop policy if exists "Users insert own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users update own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users delete own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users manage own vp_subscriptions" on firstparty.vp_subscriptions;

-- Keep (or recreate) select-only for authenticated users
drop policy if exists "Users select own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users select own vp_subscriptions"
  on firstparty.vp_subscriptions for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

-- Narrow grants: authenticated can only read; service_role retains full access
revoke all on table firstparty.vp_subscriptions from authenticated;
grant select on table firstparty.vp_subscriptions to authenticated;
grant all on table firstparty.vp_subscriptions to service_role;

-- Harden firstparty.vp_usage: clients may SELECT own rows only.
-- Counters are incremented by service_role (API / VP function handlers).
-- Prevents resetting free-tier quotas by deleting/updating usage rows.
-- Safe to re-run.

alter table firstparty.vp_usage enable row level security;

drop policy if exists "Users insert own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users update own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users delete own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users manage own vp_usage" on firstparty.vp_usage;

drop policy if exists "Users select own vp_usage" on firstparty.vp_usage;
create policy "Users select own vp_usage"
  on firstparty.vp_usage for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

revoke all on table firstparty.vp_usage from authenticated;
grant select on table firstparty.vp_usage to authenticated;
grant all on table firstparty.vp_usage to service_role;

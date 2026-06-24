-- Fix RLS + grants for firstparty tables returning "permission denied"
-- Run in Supabase SQL Editor. Safe to re-run (idempotent).
-- Prerequisite: tables exist + public.is_platform_owner() optional (not used here)

create schema if not exists firstparty;

-- ═══════════════════════════════════════════════════════════════════
-- Enable RLS
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_holidays enable row level security;
alter table firstparty.vp_goals enable row level security;
alter table firstparty.vp_notification_preferences enable row level security;
alter table firstparty.vp_notifications enable row level security;
alter table firstparty.vp_subscriptions enable row level security;
alter table firstparty.vp_invoices enable row level security;
alter table firstparty.vp_usage enable row level security;

-- ═══════════════════════════════════════════════════════════════════
-- vp_holidays — own rows via user_id
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_holidays" on firstparty.vp_holidays;
create policy "Users select own vp_holidays"
  on firstparty.vp_holidays for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own vp_holidays" on firstparty.vp_holidays;
create policy "Users insert own vp_holidays"
  on firstparty.vp_holidays for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own vp_holidays" on firstparty.vp_holidays;
create policy "Users update own vp_holidays"
  on firstparty.vp_holidays for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own vp_holidays" on firstparty.vp_holidays;
create policy "Users delete own vp_holidays"
  on firstparty.vp_holidays for delete
  to authenticated
  using (auth.uid() = user_id);

-- Drop legacy combined policy if present from earlier migrations
drop policy if exists "Users manage own vp_holidays" on firstparty.vp_holidays;

-- ═══════════════════════════════════════════════════════════════════
-- vp_goals — own rows via user_id
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_goals" on firstparty.vp_goals;
create policy "Users select own vp_goals"
  on firstparty.vp_goals for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own vp_goals" on firstparty.vp_goals;
create policy "Users insert own vp_goals"
  on firstparty.vp_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own vp_goals" on firstparty.vp_goals;
create policy "Users update own vp_goals"
  on firstparty.vp_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own vp_goals" on firstparty.vp_goals;
create policy "Users delete own vp_goals"
  on firstparty.vp_goals for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users manage own vp_goals" on firstparty.vp_goals;

-- ═══════════════════════════════════════════════════════════════════
-- vp_notification_preferences — own rows via user_id
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_notification_preferences" on firstparty.vp_notification_preferences;
create policy "Users select own vp_notification_preferences"
  on firstparty.vp_notification_preferences for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own vp_notification_preferences" on firstparty.vp_notification_preferences;
create policy "Users insert own vp_notification_preferences"
  on firstparty.vp_notification_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own vp_notification_preferences" on firstparty.vp_notification_preferences;
create policy "Users update own vp_notification_preferences"
  on firstparty.vp_notification_preferences for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own vp_notification_preferences" on firstparty.vp_notification_preferences;
create policy "Users delete own vp_notification_preferences"
  on firstparty.vp_notification_preferences for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users manage own vp_notification_preferences" on firstparty.vp_notification_preferences;

-- ═══════════════════════════════════════════════════════════════════
-- vp_notifications — user_id or recipient_email
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_notifications" on firstparty.vp_notifications;
create policy "Users select own vp_notifications"
  on firstparty.vp_notifications for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users insert own vp_notifications" on firstparty.vp_notifications;
create policy "Users insert own vp_notifications"
  on firstparty.vp_notifications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users update own vp_notifications" on firstparty.vp_notifications;
create policy "Users update own vp_notifications"
  on firstparty.vp_notifications for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users delete own vp_notifications" on firstparty.vp_notifications;
create policy "Users delete own vp_notifications"
  on firstparty.vp_notifications for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users manage own vp_notifications" on firstparty.vp_notifications;

-- ═══════════════════════════════════════════════════════════════════
-- vp_subscriptions — user_id or user_email
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users select own vp_subscriptions"
  on firstparty.vp_subscriptions for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users insert own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users insert own vp_subscriptions"
  on firstparty.vp_subscriptions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users update own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users update own vp_subscriptions"
  on firstparty.vp_subscriptions for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users delete own vp_subscriptions" on firstparty.vp_subscriptions;
create policy "Users delete own vp_subscriptions"
  on firstparty.vp_subscriptions for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users manage own vp_subscriptions" on firstparty.vp_subscriptions;

-- ═══════════════════════════════════════════════════════════════════
-- vp_invoices — user_id or user_email
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_invoices" on firstparty.vp_invoices;
create policy "Users select own vp_invoices"
  on firstparty.vp_invoices for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users insert own vp_invoices" on firstparty.vp_invoices;
create policy "Users insert own vp_invoices"
  on firstparty.vp_invoices for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users update own vp_invoices" on firstparty.vp_invoices;
create policy "Users update own vp_invoices"
  on firstparty.vp_invoices for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users delete own vp_invoices" on firstparty.vp_invoices;
create policy "Users delete own vp_invoices"
  on firstparty.vp_invoices for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users manage own vp_invoices" on firstparty.vp_invoices;

-- ═══════════════════════════════════════════════════════════════════
-- vp_usage — user_id or user_email
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_usage" on firstparty.vp_usage;
create policy "Users select own vp_usage"
  on firstparty.vp_usage for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users insert own vp_usage" on firstparty.vp_usage;
create policy "Users insert own vp_usage"
  on firstparty.vp_usage for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users update own vp_usage" on firstparty.vp_usage;
create policy "Users update own vp_usage"
  on firstparty.vp_usage for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users delete own vp_usage" on firstparty.vp_usage;
create policy "Users delete own vp_usage"
  on firstparty.vp_usage for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower((select email from auth.users where id = auth.uid()))
  );

drop policy if exists "Users manage own vp_usage" on firstparty.vp_usage;

-- ═══════════════════════════════════════════════════════════════════
-- Grants
-- ═══════════════════════════════════════════════════════════════════

grant usage on schema firstparty to authenticated, service_role;

grant all on table firstparty.vp_holidays to authenticated, service_role;
grant all on table firstparty.vp_goals to authenticated, service_role;
grant all on table firstparty.vp_notification_preferences to authenticated, service_role;
grant all on table firstparty.vp_notifications to authenticated, service_role;
grant all on table firstparty.vp_subscriptions to authenticated, service_role;
grant all on table firstparty.vp_invoices to authenticated, service_role;
grant all on table firstparty.vp_usage to authenticated, service_role;

grant usage, select on all sequences in schema firstparty to authenticated, service_role;

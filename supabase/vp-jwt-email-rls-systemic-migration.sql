-- Systemic fix: email-keyed VP RLS must use auth.jwt() ->> 'email', NOT auth.users.
-- Authenticated clients cannot SELECT auth.users (permission denied for table users).

-- Helper expression used in all policies below:
-- lower(coalesce(auth.jwt() ->> 'email', ''))

-- ═══════════════════════════════════════════════════════════════════
-- vp_notifications
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_notifications" on firstparty.vp_notifications;
drop policy if exists "Users insert own vp_notifications" on firstparty.vp_notifications;
drop policy if exists "Users update own vp_notifications" on firstparty.vp_notifications;
drop policy if exists "Users delete own vp_notifications" on firstparty.vp_notifications;
drop policy if exists "Users manage own vp_notifications" on firstparty.vp_notifications;

create policy "Users manage own vp_notifications"
  on firstparty.vp_notifications for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

-- ═══════════════════════════════════════════════════════════════════
-- vp_subscriptions
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users insert own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users update own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users delete own vp_subscriptions" on firstparty.vp_subscriptions;
drop policy if exists "Users manage own vp_subscriptions" on firstparty.vp_subscriptions;

create policy "Users manage own vp_subscriptions"
  on firstparty.vp_subscriptions for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

-- ═══════════════════════════════════════════════════════════════════
-- vp_invoices
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_invoices" on firstparty.vp_invoices;
drop policy if exists "Users insert own vp_invoices" on firstparty.vp_invoices;
drop policy if exists "Users update own vp_invoices" on firstparty.vp_invoices;
drop policy if exists "Users delete own vp_invoices" on firstparty.vp_invoices;
drop policy if exists "Users manage own vp_invoices" on firstparty.vp_invoices;

create policy "Users manage own vp_invoices"
  on firstparty.vp_invoices for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

-- ═══════════════════════════════════════════════════════════════════
-- vp_usage
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists "Users select own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users insert own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users update own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users delete own vp_usage" on firstparty.vp_usage;
drop policy if exists "Users manage own vp_usage" on firstparty.vp_usage;

create policy "Users manage own vp_usage"
  on firstparty.vp_usage for all
  to authenticated
  using (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  )
  with check (
    auth.uid() = user_id
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

grant select, insert, update, delete on table firstparty.vp_notifications to authenticated;
grant select, insert, update, delete on table firstparty.vp_subscriptions to authenticated;
grant select, insert, update, delete on table firstparty.vp_invoices to authenticated;
grant select, insert, update, delete on table firstparty.vp_usage to authenticated;

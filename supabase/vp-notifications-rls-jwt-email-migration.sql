-- Fix vp_notifications (and related email-keyed VP tables) RLS:
-- authenticated users cannot SELECT auth.users, so recipient_email policies
-- must use the JWT email claim instead.

-- vp_notifications
drop policy if exists "Users select own vp_notifications" on firstparty.vp_notifications;
create policy "Users select own vp_notifications"
  on firstparty.vp_notifications for select
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

drop policy if exists "Users insert own vp_notifications" on firstparty.vp_notifications;
create policy "Users insert own vp_notifications"
  on firstparty.vp_notifications for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

drop policy if exists "Users update own vp_notifications" on firstparty.vp_notifications;
create policy "Users update own vp_notifications"
  on firstparty.vp_notifications for update
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

drop policy if exists "Users delete own vp_notifications" on firstparty.vp_notifications;
create policy "Users delete own vp_notifications"
  on firstparty.vp_notifications for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_platform_owner()
  );

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

grant select, insert, update, delete on table firstparty.vp_notifications to authenticated;

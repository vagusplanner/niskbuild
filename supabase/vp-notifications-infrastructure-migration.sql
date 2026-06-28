-- Vagus Planner: scheduled reminders + device push tokens (firstparty schema)
-- Run after vp-billing-notifications-migration.sql
-- Email delivery uses platform Resend (RESEND_API_KEY) — same as NiskBuild auth/support mail.

-- ═══════════════════════════════════════════════════════════════════
-- Scheduled reminders (email + push via cron)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  reminder_type text not null default 'general'
    check (reminder_type in ('general', 'prayer', 'task_due', 'event', 'journal')),
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  channel text
    check (channel is null or channel in ('email', 'push', 'both')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_reminders_due
  on firstparty.vp_reminders (scheduled_at)
  where sent_at is null;

create index if not exists idx_vp_reminders_user
  on firstparty.vp_reminders (user_id, scheduled_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- APNs device tokens (Capacitor push plugin on iOS)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.vp_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  push_token text not null,
  platform text not null default 'ios'
    check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_device_tokens_user_token_unique unique (user_id, push_token)
);

create index if not exists idx_vp_device_tokens_user
  on firstparty.vp_device_tokens (user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Per-user delivery channel defaults on vp_user_settings
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_user_settings
  add column if not exists push_notifications_enabled boolean not null default true,
  add column if not exists email_notifications_enabled boolean not null default true,
  add column if not exists prayer_reminders_enabled boolean not null default true,
  add column if not exists task_due_reminders_enabled boolean not null default true,
  add column if not exists event_reminders_enabled boolean not null default true;

comment on column firstparty.vp_user_settings.push_notifications_enabled is
  'When false, APNs push is not sent for VP reminders.';
comment on column firstparty.vp_user_settings.email_notifications_enabled is
  'When false, Resend email is not sent for VP reminders.';

-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.vp_reminders enable row level security;
alter table firstparty.vp_device_tokens enable row level security;

drop policy if exists "Users manage own vp_reminders" on firstparty.vp_reminders;
create policy "Users manage own vp_reminders"
  on firstparty.vp_reminders for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_device_tokens" on firstparty.vp_device_tokens;
create policy "Users manage own vp_device_tokens"
  on firstparty.vp_device_tokens for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on firstparty.vp_reminders to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_device_tokens to authenticated, service_role;

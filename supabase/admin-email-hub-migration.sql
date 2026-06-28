-- Admin email hub: full send history + open/click tracking on email_sends
-- Prerequisite: retention-email-churn-migration.sql

alter table public.email_sends
  add column if not exists subject text,
  add column if not exists resend_id text,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists source text not null default 'system',
  add column if not exists html_snapshot text;

-- Allow resends: drop one-row-per-template constraint, keep lookup index
alter table public.email_sends
  drop constraint if exists email_sends_user_template_unique;

create index if not exists idx_email_sends_user_template
  on public.email_sends (user_id, template_key, sent_at desc);

create index if not exists idx_email_sends_sent_at
  on public.email_sends (sent_at desc);

create index if not exists idx_email_sends_resend_id
  on public.email_sends (resend_id)
  where resend_id is not null;

-- Platform feature adoption (admin revenue dashboard)
create table if not exists public.feature_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  used_at timestamptz not null default now()
);

create index if not exists idx_feature_usage_key_user
  on public.feature_usage (feature_key, user_id);

create index if not exists idx_feature_usage_used_at
  on public.feature_usage (used_at desc);

alter table public.feature_usage enable row level security;

create policy "No direct client access to feature_usage"
  on public.feature_usage for all using (false) with check (false);

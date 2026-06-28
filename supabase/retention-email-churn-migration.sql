-- Retention email lifecycle + admin churn risk
-- Prerequisite: retention-conversion-migration.sql (credit_alert flags, previews)

-- Per-user build activity (for churn: paid users with no builds in 14 days)
alter table public.profiles
  add column if not exists last_build_at timestamptz;

alter table public.profiles
  add column if not exists subscription_ended_at timestamptz;

alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.profiles
  add column if not exists builds_this_period integer not null default 0;

create index if not exists idx_profiles_last_build_at
  on public.profiles (last_build_at)
  where last_build_at is not null;

create index if not exists idx_profiles_churn_candidates
  on public.profiles (subscription_tier, subscription_status, last_build_at);

-- Idempotent send log (one row per user + template_key)
create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null,
  sent_at timestamptz not null default now(),
  constraint email_sends_user_template_unique unique (user_id, template_key)
);

create index if not exists idx_email_sends_user_sent
  on public.email_sends (user_id, sent_at desc);

alter table public.email_sends enable row level security;

create policy "Users read own email_sends"
  on public.email_sends for select
  to authenticated
  using (auth.uid() = user_id);

-- NPS survey responses (day-14 lifecycle email)
create table if not exists public.nps_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null check (score >= 0 and score <= 10),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_nps_scores_user_created
  on public.nps_scores (user_id, created_at desc);

alter table public.nps_scores enable row level security;

create policy "Users manage own nps_scores"
  on public.nps_scores for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.email_sends to authenticated;
grant select, insert on public.nps_scores to authenticated;

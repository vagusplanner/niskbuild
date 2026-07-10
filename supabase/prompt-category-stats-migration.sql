-- Internal demand analytics aggregate log (prompt category trends)
-- Run in Supabase SQL editor after analytics-demand-migration.sql.
-- Additive only. No user_id — not joinable to profiles for identity re-identification.

create table if not exists public.prompt_category_stats (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in (
      'medical',
      'ecommerce',
      'education',
      'real_estate',
      'saas',
      'restaurant',
      'fitness',
      'nonprofit',
      'portfolio',
      'other'
    )),
  -- Broad age bucket from existing profiles.age_range when set; null if unknown
  age_range text,
  -- Broad country/region from existing profiles.analytics_region when set; null if unknown
  region text,
  -- Truncated period start (UTC) — week granularity (Monday 00:00)
  period_week date not null,
  -- Truncated period start (UTC) — calendar month (1st of month)
  period_month date not null,
  created_at timestamptz not null default now()
);

comment on table public.prompt_category_stats is
  'Anonymous aggregate log of build prompt categories. No user_id, no prompt text. Internal admin only.';

create index if not exists idx_prompt_category_stats_category_week
  on public.prompt_category_stats (category, period_week desc);

create index if not exists idx_prompt_category_stats_category_month
  on public.prompt_category_stats (category, period_month desc);

create index if not exists idx_prompt_category_stats_week
  on public.prompt_category_stats (period_week desc);

create index if not exists idx_prompt_category_stats_month
  on public.prompt_category_stats (period_month desc);

create index if not exists idx_prompt_category_stats_region_month
  on public.prompt_category_stats (region, period_month desc)
  where region is not null;

create index if not exists idx_prompt_category_stats_age_month
  on public.prompt_category_stats (age_range, period_month desc)
  where age_range is not null;

alter table public.prompt_category_stats enable row level security;

-- No public client access — platform owners via is_platform_owner(); writes use service_role
create policy "Platform owners read prompt_category_stats"
  on public.prompt_category_stats for select
  to authenticated
  using (public.is_platform_owner());

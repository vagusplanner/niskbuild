-- Demographics + town on anonymous usage_events (additive)
-- Run after analytics-demand-migration.sql

alter table public.profiles
  add column if not exists age_range text,
  add column if not exists town text,
  add column if not exists analytics_opt_in boolean default true;

comment on column public.profiles.analytics_opt_in is
  'When false, no usage_events rows are created for this user. Default true (opt-out model).';

alter table public.usage_events
  add column if not exists town text,
  add column if not exists age_range text;

create index if not exists idx_usage_events_age_range_created
  on public.usage_events (age_range, created_at desc)
  where age_range is not null;

create index if not exists idx_usage_events_town_created
  on public.usage_events (town, created_at desc)
  where town is not null;

-- k-anonymity threshold enforced in SQL (not UI-only)
create or replace function public.analytics_min_volume_threshold()
returns integer
language sql
immutable
as $$
  select 8;
$$;

revoke all on function public.analytics_min_volume_threshold() from public;
grant execute on function public.analytics_min_volume_threshold() to service_role;

-- Single dimension: builds by age range (coarse buckets — no volume floor)
create or replace function public.analytics_builds_by_age_range(since_ts timestamptz)
returns table (age_range text, event_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(ue.age_range, 'prefer not to say') as age_range,
    count(*)::bigint as event_count
  from public.usage_events ue
  where ue.event_type = 'build'
    and ue.created_at >= since_ts
  group by coalesce(ue.age_range, 'prefer not to say')
  order by event_count desc;
$$;

revoke all on function public.analytics_builds_by_age_range(timestamptz) from public;
grant execute on function public.analytics_builds_by_age_range(timestamptz) to service_role;

-- Cross-tab: age range × category (HAVING count >= 8)
create or replace function public.analytics_builds_by_age_category(since_ts timestamptz)
returns table (
  age_range text,
  category_slug text,
  category_icon text,
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(ue.age_range, 'prefer not to say') as age_range,
    coalesce(ac.name, 'other') as category_slug,
    coalesce(ac.icon, '📦') as category_icon,
    count(*)::bigint as event_count
  from public.usage_events ue
  left join public.app_categories ac on ac.id = ue.category_id
  where ue.event_type = 'build'
    and ue.created_at >= since_ts
  group by coalesce(ue.age_range, 'prefer not to say'), ac.name, ac.icon
  having count(*) >= public.analytics_min_volume_threshold()
  order by event_count desc;
$$;

revoke all on function public.analytics_builds_by_age_category(timestamptz) from public;
grant execute on function public.analytics_builds_by_age_category(timestamptz) to service_role;

-- Cross-tab: town × category (HAVING count >= 8)
create or replace function public.analytics_builds_by_town_category(since_ts timestamptz)
returns table (
  town text,
  category_slug text,
  category_icon text,
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(ue.town), ''), 'Unknown') as town,
    coalesce(ac.name, 'other') as category_slug,
    coalesce(ac.icon, '📦') as category_icon,
    count(*)::bigint as event_count
  from public.usage_events ue
  left join public.app_categories ac on ac.id = ue.category_id
  where ue.event_type = 'build'
    and ue.created_at >= since_ts
    and ue.town is not null
    and trim(ue.town) <> ''
  group by coalesce(nullif(trim(ue.town), ''), 'Unknown'), ac.name, ac.icon
  having count(*) >= public.analytics_min_volume_threshold()
  order by event_count desc;
$$;

revoke all on function public.analytics_builds_by_town_category(timestamptz) from public;
grant execute on function public.analytics_builds_by_town_category(timestamptz) to service_role;

-- Cross-tab: age range × town (HAVING count >= 8)
create or replace function public.analytics_builds_by_age_town(since_ts timestamptz)
returns table (
  age_range text,
  town text,
  event_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(ue.age_range, 'prefer not to say') as age_range,
    coalesce(nullif(trim(ue.town), ''), 'Unknown') as town,
    count(*)::bigint as event_count
  from public.usage_events ue
  where ue.event_type = 'build'
    and ue.created_at >= since_ts
    and ue.town is not null
    and trim(ue.town) <> ''
  group by coalesce(ue.age_range, 'prefer not to say'), coalesce(nullif(trim(ue.town), ''), 'Unknown')
  having count(*) >= public.analytics_min_volume_threshold()
  order by event_count desc;
$$;

revoke all on function public.analytics_builds_by_age_town(timestamptz) from public;
grant execute on function public.analytics_builds_by_age_town(timestamptz) to service_role;

-- Town-level builds only (HAVING count >= 8)
create or replace function public.analytics_builds_by_town(since_ts timestamptz)
returns table (town text, event_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(ue.town), ''), 'Unknown') as town,
    count(*)::bigint as event_count
  from public.usage_events ue
  where ue.event_type = 'build'
    and ue.created_at >= since_ts
    and ue.town is not null
    and trim(ue.town) <> ''
  group by coalesce(nullif(trim(ue.town), ''), 'Unknown')
  having count(*) >= public.analytics_min_volume_threshold()
  order by event_count desc;
$$;

revoke all on function public.analytics_builds_by_town(timestamptz) from public;
grant execute on function public.analytics_builds_by_town(timestamptz) to service_role;

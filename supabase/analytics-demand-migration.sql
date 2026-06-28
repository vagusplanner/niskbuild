-- Aggregate demand analytics (anonymous usage_events + app categories)
-- Run in Supabase SQL editor. Additive only.

create table if not exists public.app_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null
);

insert into public.app_categories (name, icon) values
  ('business', '💼'),
  ('medical', '🏥'),
  ('restaurant', '🍽️'),
  ('finance', '💰'),
  ('productivity', '⚡'),
  ('education', '📚'),
  ('fitness', '💪'),
  ('ecommerce', '🛒'),
  ('social', '💬'),
  ('gaming', '🎮'),
  ('other', '📦')
on conflict (name) do nothing;

alter table public.projects
  add column if not exists category_id uuid references public.app_categories(id);

create index if not exists idx_projects_category_id
  on public.projects (category_id)
  where category_id is not null;

alter table firstparty.app_registry
  add column if not exists category_id uuid references public.app_categories(id);

-- Anonymous demand events — NO user_id, NO prompt text
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.app_categories(id),
  region text not null default 'Other',
  event_type text not null check (event_type in ('build', 'export', 'signup')),
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_created_at
  on public.usage_events (created_at desc);

create index if not exists idx_usage_events_event_type_created
  on public.usage_events (event_type, created_at desc);

create index if not exists idx_usage_events_category_created
  on public.usage_events (category_id, created_at desc)
  where category_id is not null;

create index if not exists idx_usage_events_region_created
  on public.usage_events (region, created_at desc);

alter table public.usage_events enable row level security;
alter table public.app_categories enable row level security;

-- Categories are reference data (read-only for authenticated users)
create policy "Anyone can read app categories"
  on public.app_categories for select
  to authenticated, anon
  using (true);

-- usage_events: no public access — admin API uses service_role only
create policy "Platform owners read usage_events"
  on public.usage_events for select
  to authenticated
  using (public.is_platform_owner());

-- Internal idempotency for signup events (never exposed in analytics API)
create table if not exists public.analytics_signup_recorded (
  user_id uuid primary key references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now()
);

alter table public.analytics_signup_recorded enable row level security;

-- Service role only — no client policies

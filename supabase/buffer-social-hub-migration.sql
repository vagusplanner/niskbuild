-- Buffer OAuth + Social Hub (firstparty schema)
-- Prerequisite: expose `firstparty` in Supabase Dashboard → API → Exposed schemas
-- Run after firstparty-marketplace-layers-migration.sql

-- ═══════════════════════════════════════════════════════════════════
-- Short-lived OAuth CSRF state (never pass raw user IDs as state)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'buffer'
    check (provider in ('buffer')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_oauth_states_user_expires
  on firstparty.oauth_states (user_id, expires_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Buffer access tokens (server-side only)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.buffer_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  buffer_profile_id text,
  scopes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Scheduled / queued social posts
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null
    check (platform in ('instagram', 'linkedin', 'twitter', 'facebook', 'tiktok')),
  body text not null,
  media_url text,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'scheduled', 'published', 'failed')),
  buffer_update_id text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_social_posts_user_status
  on firstparty.social_posts (user_id, status, scheduled_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- Social Hub content ops config (platform owner)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists firstparty.social_hub_config (
  id text primary key default 'default',
  current_phase int not null default 0 check (current_phase between 0 and 4),
  current_week int not null default 1 check (current_week between 1 and 12),
  ugc_percentage int not null default 25 check (ugc_percentage between 0 and 100),
  active_theme_ids text[] not null default '{}',
  weekly_review_notes text,
  updated_at timestamptz not null default now()
);

insert into firstparty.social_hub_config (id, current_phase, current_week, ugc_percentage)
values ('default', 0, 1, 25)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════

alter table firstparty.oauth_states enable row level security;
alter table firstparty.buffer_tokens enable row level security;
alter table firstparty.social_posts enable row level security;
alter table firstparty.social_hub_config enable row level security;

drop policy if exists "Users read own oauth_states" on firstparty.oauth_states;
create policy "Users read own oauth_states"
  on firstparty.oauth_states for select
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Service manages oauth_states" on firstparty.oauth_states;
create policy "Service manages oauth_states"
  on firstparty.oauth_states for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users manage own buffer_tokens" on firstparty.buffer_tokens;
create policy "Users manage own buffer_tokens"
  on firstparty.buffer_tokens for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own social_posts" on firstparty.social_posts;
create policy "Users manage own social_posts"
  on firstparty.social_posts for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Platform owners manage social_hub_config" on firstparty.social_hub_config;
create policy "Platform owners manage social_hub_config"
  on firstparty.social_hub_config for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

grant usage on schema firstparty to authenticated, service_role;
grant select, insert, update, delete on firstparty.oauth_states to authenticated, service_role;
grant select, insert, update, delete on firstparty.buffer_tokens to authenticated, service_role;
grant select, insert, update, delete on firstparty.social_posts to authenticated, service_role;
grant select, insert, update, delete on firstparty.social_hub_config to authenticated, service_role;

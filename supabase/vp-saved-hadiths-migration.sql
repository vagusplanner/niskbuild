-- Vagus Planner: saved / favorited hadiths (firstparty schema)
-- Run in Supabase SQL Editor. Safe to re-run.
-- Prerequisite: firstparty schema + public.is_platform_owner()

create schema if not exists firstparty;

create table if not exists firstparty.vp_saved_hadiths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  english_translation text not null default '',
  arabic_text text,
  narrator text,
  source text,
  reference text,
  collection text,
  category text,
  grade text,
  title text,
  notes text,
  hadith_number integer,
  is_favorite boolean not null default true,
  ai_context jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_saved_hadiths_user_created
  on firstparty.vp_saved_hadiths (user_id, created_at desc);

create index if not exists idx_vp_saved_hadiths_user_favorite
  on firstparty.vp_saved_hadiths (user_id, is_favorite)
  where is_favorite = true;

alter table firstparty.vp_saved_hadiths enable row level security;

drop policy if exists "Users manage own vp_saved_hadiths" on firstparty.vp_saved_hadiths;
create policy "Users manage own vp_saved_hadiths"
  on firstparty.vp_saved_hadiths for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on firstparty.vp_saved_hadiths to authenticated, service_role;

comment on table firstparty.vp_saved_hadiths is
  'User-saved / favorited hadiths for Vagus Planner (Daily Hadith, browsers, profile saved items).';

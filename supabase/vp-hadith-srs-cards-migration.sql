-- Vagus Planner: Hadith spaced-repetition cards (firstparty schema)
-- Run in Supabase SQL Editor after firstparty schema exists.
-- Prerequisite: firstparty-marketplace-layers-migration.sql

create schema if not exists firstparty;

create table if not exists firstparty.vp_hadith_srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hadith_text text not null,
  hadith_arabic text,
  hadith_narrator text,
  hadith_chapter text,
  hadith_collection text not null default 'bukhari',
  hadith_number integer,
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  status text not null default 'new'
    check (status in ('new', 'learning', 'review', 'mastered')),
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_hadith_srs_cards_user_due
  on firstparty.vp_hadith_srs_cards (user_id, next_review_at);

create index if not exists idx_vp_hadith_srs_cards_user_status
  on firstparty.vp_hadith_srs_cards (user_id, status);

alter table firstparty.vp_hadith_srs_cards enable row level security;

drop policy if exists "Users manage own vp_hadith_srs_cards" on firstparty.vp_hadith_srs_cards;
create policy "Users manage own vp_hadith_srs_cards"
  on firstparty.vp_hadith_srs_cards for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on firstparty.vp_hadith_srs_cards to authenticated, service_role;

comment on table firstparty.vp_hadith_srs_cards is
  'Spaced-repetition deck for Hadith memorization in Vagus Planner.';

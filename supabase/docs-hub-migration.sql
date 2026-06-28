-- NiskBuild in-app documentation hub
-- 1. Run this file in Supabase SQL editor
-- 2. Run supabase/docs-hub-seed.sql (regenerate: node --experimental-strip-types scripts/generate-docs-seed.mjs)

create table if not exists public.doc_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in (
    'Getting Started',
    'Using NiskBuild',
    'Exporting to App Store',
    'Importing Apps',
    'Your Plan'
  )),
  content text not null,
  plan_visibility text[] not null default '{all}',
  order_index int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_doc_articles_category_order
  on public.doc_articles (category, order_index);

create table if not exists public.doc_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.doc_articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  helpful boolean not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint doc_feedback_user_article_unique unique (article_id, user_id)
);

create index if not exists idx_doc_feedback_article
  on public.doc_feedback (article_id);

alter table public.doc_articles enable row level security;
alter table public.doc_feedback enable row level security;

drop policy if exists "Authenticated users read doc articles" on public.doc_articles;
create policy "Authenticated users read doc articles"
  on public.doc_articles for select
  to authenticated
  using (true);

drop policy if exists "Users manage own doc feedback" on public.doc_feedback;
create policy "Users manage own doc feedback"
  on public.doc_feedback for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select on public.doc_articles to authenticated;
grant select, insert, update on public.doc_feedback to authenticated;

-- Seed: run scripts/generate-docs-seed.mjs and apply supabase/docs-hub-seed.sql

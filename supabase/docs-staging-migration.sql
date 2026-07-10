-- Docs staging: draft/published status + flexible product categories + owner write access
-- Run in Supabase SQL editor after docs-hub-migration.sql
-- Then run: node scripts/generate-docs-staging-seed.mjs  (or apply supabase/docs-staging-seed.sql)

-- 1) Status column (existing rows stay published)
alter table public.doc_articles
  add column if not exists status text not null default 'published';

alter table public.doc_articles
  drop constraint if exists doc_articles_status_check;

alter table public.doc_articles
  add constraint doc_articles_status_check
  check (status in ('draft', 'published'));

create index if not exists idx_doc_articles_status
  on public.doc_articles (status);

-- 2) Expand categories for staging docs (keep legacy hub categories)
alter table public.doc_articles
  drop constraint if exists doc_articles_category_check;

alter table public.doc_articles
  add constraint doc_articles_category_check
  check (category in (
    'Getting Started',
    'Using NiskBuild',
    'Exporting to App Store',
    'Importing Apps',
    'Your Plan',
    'product',
    'plans'
  ));

-- 3) Keep updated_at fresh on edit
create or replace function public.set_doc_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_doc_articles_updated_at on public.doc_articles;
create trigger trg_doc_articles_updated_at
  before update on public.doc_articles
  for each row
  execute function public.set_doc_articles_updated_at();

-- 4) RLS: authenticated read published only; platform owners read/write all
drop policy if exists "Authenticated users read doc articles" on public.doc_articles;
drop policy if exists "Authenticated users read published doc articles" on public.doc_articles;
drop policy if exists "Platform owners manage doc articles" on public.doc_articles;

create policy "Authenticated users read published doc articles"
  on public.doc_articles for select
  to authenticated
  using (
    status = 'published'
    or public.is_platform_owner()
  );

create policy "Platform owners manage doc articles"
  on public.doc_articles for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

grant select on public.doc_articles to authenticated;
grant insert, update, delete on public.doc_articles to authenticated;

-- 5) Status map for seed suppression (draft must hide seed-backed public docs)
create or replace function public.list_doc_article_statuses()
returns table (slug text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select d.slug, d.status
  from public.doc_articles d;
$$;

revoke all on function public.list_doc_article_statuses() from public;
grant execute on function public.list_doc_article_statuses() to authenticated;
grant execute on function public.list_doc_article_statuses() to service_role;

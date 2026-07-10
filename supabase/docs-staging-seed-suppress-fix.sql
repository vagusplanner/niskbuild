-- Fix: allow public docs merge to learn which slugs are unpublished (draft)
-- without exposing draft markdown content to non-owners.
-- Run after docs-staging-migration.sql

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

comment on function public.list_doc_article_statuses() is
  'Returns slug+status for all doc_articles so seed merge can suppress unpublished seed-backed docs without leaking draft content.';

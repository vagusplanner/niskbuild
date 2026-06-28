-- Run after docs-hub-migration.sql and docs-hub-seed.sql
-- "Success. No rows returned" on the seed file is normal (INSERT without RETURNING).

select count(*)::int as article_count from public.doc_articles;

select slug, title, category, order_index
from public.doc_articles
order by order_index;

-- Expected: article_count = 11, including slug progressive-web-apps-pwa

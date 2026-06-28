#!/usr/bin/env node
/** Generates supabase/docs-hub-seed.sql from lib/docs/seed-articles.ts */
import { writeFileSync } from 'node:fs';
import { SEED_DOC_ARTICLES } from '../lib/docs/seed-articles.ts';

function sqlLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

const lines = [
  '-- Auto-generated from lib/docs/seed-articles.ts — run after docs-hub-migration.sql',
  'delete from public.doc_feedback;',
  'delete from public.doc_articles;',
  '',
];

for (const article of SEED_DOC_ARTICLES) {
  const visibility = `{${article.plan_visibility.join(',')}}`;
  lines.push(`insert into public.doc_articles (slug, title, category, content, plan_visibility, order_index)`);
  lines.push(
    `values (${sqlLiteral(article.slug)}, ${sqlLiteral(article.title)}, ${sqlLiteral(article.category)}, ${sqlLiteral(article.content)}, '${visibility}'::text[], ${article.order_index});`
  );
  lines.push('');
}

writeFileSync(new URL('../supabase/docs-hub-seed.sql', import.meta.url), lines.join('\n'));
console.log('Wrote supabase/docs-hub-seed.sql');

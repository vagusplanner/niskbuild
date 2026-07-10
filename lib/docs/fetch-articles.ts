import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { DocArticle, DocArticleStatus, DocArticleSummary } from '@/lib/docs/types';
import { SEED_DOC_ARTICLES } from '@/lib/docs/seed-articles';
import {
  filterArticlesForSidebar,
  normalizeUserTier,
  suggestDocSlugsForPath,
  tierForPlanDocs,
} from '@/lib/docs/utils';

function asStatus(value: unknown): DocArticleStatus {
  return value === 'draft' ? 'draft' : 'published';
}

function seedSummaries(): DocArticleSummary[] {
  return SEED_DOC_ARTICLES.map((a) => ({
    id: `seed-${a.slug}`,
    slug: a.slug,
    title: a.title,
    category: a.category as DocArticleSummary['category'],
    plan_visibility: [...a.plan_visibility],
    order_index: a.order_index,
    updated_at: new Date().toISOString(),
    status: 'published' as const,
  }));
}

function seedArticleBySlug(slug: string): DocArticle | null {
  const match = SEED_DOC_ARTICLES.find((a) => a.slug === slug);
  if (!match) return null;
  return {
    id: `seed-${match.slug}`,
    slug: match.slug,
    title: match.title,
    category: match.category as DocArticle['category'],
    content: match.content,
    plan_visibility: [...match.plan_visibility],
    order_index: match.order_index,
    updated_at: new Date().toISOString(),
    status: 'published',
  };
}

function isPublished(article: Pick<DocArticleSummary, 'status'>): boolean {
  return asStatus(article.status) === 'published';
}

/**
 * Public merge: seed (published) + DB published only.
 * Draft DB rows never appear and never override seed for public readers.
 */
function mergePublishedArticles(
  dbRows: DocArticleSummary[],
  seeded: DocArticleSummary[],
  tier: string
): DocArticleSummary[] {
  const planTier = tierForPlanDocs(tier);
  const bySlug = new Map<string, DocArticleSummary>();

  for (const article of seeded) {
    bySlug.set(article.slug, article);
  }

  for (const article of dbRows) {
    if (!isPublished(article)) continue;
    bySlug.set(article.slug, { ...article, status: 'published' });
  }

  const merged = [...bySlug.values()].sort(
    (a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title)
  );

  const filtered = filterArticlesForSidebar(merged, planTier);
  if (filtered.length > 0) return filtered;

  const seedOnly = filterArticlesForSidebar(seeded, planTier);
  return seedOnly.length > 0 ? seedOnly : seeded.filter((a) => a.plan_visibility.includes('all'));
}

export async function getUserDocTier(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'free';

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  return normalizeUserTier(profile?.subscription_tier);
}

export async function listDocArticles(userTier?: string): Promise<DocArticleSummary[]> {
  const tier = userTier ?? (await getUserDocTier());
  const planTier = tierForPlanDocs(tier);
  const seeded = seedSummaries();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('doc_articles')
      .select('id, slug, title, category, plan_visibility, order_index, updated_at, status')
      .eq('status', 'published')
      .order('order_index', { ascending: true });

    if (error) {
      // Older DBs without status column — fall back without status filter
      if (error.message?.includes('status')) {
        const fallback = await supabase
          .from('doc_articles')
          .select('id, slug, title, category, plan_visibility, order_index, updated_at')
          .order('order_index', { ascending: true });
        if (fallback.error) {
          console.error('listDocArticles:', fallback.error.message);
          return filterArticlesForSidebar(seeded, planTier);
        }
        const rows = ((fallback.data ?? []) as DocArticleSummary[]).map((r) => ({
          ...r,
          status: 'published' as const,
        }));
        return mergePublishedArticles(rows, seeded, tier);
      }
      console.error('listDocArticles:', error.message);
      return filterArticlesForSidebar(seeded, planTier);
    }

    const rows = ((data ?? []) as DocArticleSummary[]).map((r) => ({
      ...r,
      status: asStatus(r.status),
    }));
    return mergePublishedArticles(rows, seeded, tier);
  } catch (error) {
    console.error('listDocArticles:', error);
    return filterArticlesForSidebar(seeded, planTier);
  }
}

export async function getDocArticleBySlug(slug: string): Promise<DocArticle | null> {
  const seed = seedArticleBySlug(slug);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('doc_articles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      const row = data as DocArticle;
      const status = asStatus(row.status);
      // Public readers only get published DB rows (RLS also enforces this for non-owners)
      if (status === 'published') {
        return {
          ...row,
          status,
          content: row.content?.trim() ? row.content : seed?.content ?? row.content,
        };
      }
      // Draft in DB: do not expose publicly; fall back to seed if present
      return seed;
    }
  } catch {
    // fall through to seed
  }

  return seed;
}

export async function searchDocArticles(
  query: string,
  userTier?: string
): Promise<DocArticleSummary[]> {
  const articles = await listDocArticles(userTier);
  const q = query.trim().toLowerCase();
  if (!q) return articles;

  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q)
  );
}

export async function getSuggestedDocArticles(
  pathname: string,
  userTier?: string
): Promise<DocArticleSummary[]> {
  const articles = await listDocArticles(userTier);
  const slugs = suggestDocSlugsForPath(pathname);
  const tier = tierForPlanDocs(userTier ?? (await getUserDocTier()));
  const onboardingSlug = `getting-started-${tier.replace(/_/g, '-')}`;

  const preferred = [onboardingSlug, ...slugs];
  const seen = new Set<string>();
  const result: DocArticleSummary[] = [];

  for (const slug of preferred) {
    const match = articles.find((a) => a.slug === slug);
    if (match && !seen.has(match.id)) {
      result.push(match);
      seen.add(match.id);
    }
  }

  for (const article of articles) {
    if (result.length >= 5) break;
    if (!seen.has(article.id)) {
      result.push(article);
      seen.add(article.id);
    }
  }

  return result.slice(0, 5);
}

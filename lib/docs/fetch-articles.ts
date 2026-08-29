import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
import { getAdminClientOrNull } from '@/lib/supabase/admin';
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

/**
 * Public merge:
 * - Start from seed (treated as published)
 * - Remove any slug that has a DB row with status=draft (unpublished seed-backed docs)
 * - Overlay DB published rows
 *
 * Critical: draft rows must suppress seed — not be ignored (which left seed visible).
 */
function mergePublishedArticles(
  publishedDbRows: DocArticleSummary[],
  seeded: DocArticleSummary[],
  unpublishedSlugs: Set<string>,
  tier: string
): DocArticleSummary[] {
  const planTier = tierForPlanDocs(tier);
  const bySlug = new Map<string, DocArticleSummary>();

  for (const article of seeded) {
    if (unpublishedSlugs.has(article.slug)) continue;
    bySlug.set(article.slug, article);
  }

  for (const article of publishedDbRows) {
    if (unpublishedSlugs.has(article.slug)) continue;
    bySlug.set(article.slug, { ...article, status: 'published' });
  }

  const merged = [...bySlug.values()].sort(
    (a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title)
  );

  const filtered = filterArticlesForSidebar(merged, planTier);
  if (filtered.length > 0) return filtered;

  const seedOnly = filterArticlesForSidebar(
    seeded.filter((a) => !unpublishedSlugs.has(a.slug)),
    planTier
  );
  return seedOnly.length > 0
    ? seedOnly
    : seeded
        .filter((a) => !unpublishedSlugs.has(a.slug) && a.plan_visibility.includes('all'));
}

type StatusRow = { slug: string; status: string };

/**
 * Load slug→status for ALL doc_articles (including drafts).
 * Prefers service-role client (bypasses published-only RLS); falls back to RPC.
 */
async function loadAllArticleStatuses(
  userClient: Awaited<ReturnType<typeof createClient>>
): Promise<StatusRow[]> {
  const admin = getAdminClientOrNull();
  if (admin) {
    const { data, error } = await admin.from('doc_articles').select('slug, status');
    if (!error && data) {
      return data as StatusRow[];
    }
    if (error && !error.message?.includes('status')) {
      console.error('loadAllArticleStatuses(admin):', error.message);
    }
  }

  const { data: rpcData, error: rpcError } = await userClient.rpc('list_doc_article_statuses');
  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData as StatusRow[];
  }
  if (rpcError && !rpcError.message?.includes('list_doc_article_statuses')) {
    console.error('loadAllArticleStatuses(rpc):', rpcError.message);
  }

  // Last resort: user-scoped select (owners see drafts; regular users only published)
  const { data, error } = await userClient.from('doc_articles').select('slug, status');
  if (error) {
    if (error.message?.includes('status')) return [];
    console.error('loadAllArticleStatuses(user):', error.message);
    return [];
  }
  return (data ?? []) as StatusRow[];
}

export async function getUserDocTier(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'free';

  if (await isPlatformOwner()) {
    return 'sovereign';
  }

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
    const statuses = await loadAllArticleStatuses(supabase);
    const unpublishedSlugs = new Set(
      statuses.filter((row) => asStatus(row.status) === 'draft').map((row) => row.slug)
    );

    const admin = getAdminClientOrNull();
    const reader = admin ?? supabase;

    const { data, error } = await reader
      .from('doc_articles')
      .select('id, slug, title, category, plan_visibility, order_index, updated_at, status')
      .eq('status', 'published')
      .order('order_index', { ascending: true });

    if (error) {
      if (error.message?.includes('status')) {
        const fallback = await reader
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
        return mergePublishedArticles(rows, seeded, new Set(), tier);
      }
      console.error('listDocArticles:', error.message);
      return filterArticlesForSidebar(
        seeded.filter((a) => !unpublishedSlugs.has(a.slug)),
        planTier
      );
    }

    const rows = ((data ?? []) as DocArticleSummary[]).map((r) => ({
      ...r,
      status: asStatus(r.status),
    }));
    return mergePublishedArticles(rows, seeded, unpublishedSlugs, tier);
  } catch (error) {
    console.error('listDocArticles:', error);
    return filterArticlesForSidebar(seeded, planTier);
  }
}

export async function getDocArticleBySlug(slug: string): Promise<DocArticle | null> {
  const seed = seedArticleBySlug(slug);

  try {
    const supabase = await createClient();
    const statuses = await loadAllArticleStatuses(supabase);
    const statusRow = statuses.find((row) => row.slug === slug);
    if (statusRow && asStatus(statusRow.status) === 'draft') {
      // Unpublished (including seed-backed): never fall back to seed content
      return null;
    }

    const admin = getAdminClientOrNull();
    const reader = admin ?? supabase;
    const { data, error } = await reader
      .from('doc_articles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error && data) {
      const row = data as DocArticle;
      const status = asStatus(row.status);
      if (status === 'draft') {
        return null;
      }
      return {
        ...row,
        status: 'published',
        content: row.content?.trim() ? row.content : seed?.content ?? row.content,
      };
    }
  } catch {
    // fall through to seed only when no DB row / status unknown
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

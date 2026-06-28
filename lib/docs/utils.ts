import type { DocArticleSummary, DocCategory } from '@/lib/docs/types';

/** Map URL paths to suggested doc slugs for the quick-access panel */
export function suggestDocSlugsForPath(pathname: string): string[] {
  if (pathname.includes('/export')) {
    return ['submitting-to-app-store', 'progressive-web-apps-pwa', 'welcome-to-niskbuild'];
  }
  if (pathname.includes('/builder')) {
    return ['welcome-to-niskbuild', 'importing-from-base44', 'progressive-web-apps-pwa'];
  }
  if (pathname.includes('/marketplace')) {
    return ['welcome-to-niskbuild'];
  }
  if (pathname.includes('/settings') || pathname.includes('/dashboard')) {
    return ['welcome-to-niskbuild', 'progressive-web-apps-pwa'];
  }
  return ['welcome-to-niskbuild', 'progressive-web-apps-pwa'];
}

export function normalizeUserTier(tier: string | null | undefined): string {
  return tier && tier.length > 0 ? tier : 'free';
}

/** Sandbox is the free-tier product name — map to free for Your Plan articles. */
export function tierForPlanDocs(tier: string | null | undefined): string {
  const normalized = normalizeUserTier(tier);
  return normalized === 'sandbox' ? 'free' : normalized;
}

export function onboardingSlugForTier(tier: string): string {
  return `getting-started-${tierForPlanDocs(tier).replace(/_/g, '-')}`;
}

function normalizePlanVisibility(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return ['all'];
}

export function articleVisibleToUser(
  article: Pick<DocArticleSummary, 'category' | 'plan_visibility'>,
  userTier: string
): boolean {
  const tier = tierForPlanDocs(userTier);
  const visibility = normalizePlanVisibility(article.plan_visibility);
  if (visibility.includes('all')) return true;
  if (article.category === 'Your Plan') {
    return visibility.includes(tier);
  }
  return visibility.includes(tier);
}

export function filterArticlesForSidebar(
  articles: DocArticleSummary[],
  userTier: string
): DocArticleSummary[] {
  const tier = tierForPlanDocs(userTier);

  return articles.filter((article) => {
    try {
      return articleVisibleToUser(article, tier);
    } catch {
      return normalizePlanVisibility(article.plan_visibility).includes('all');
    }
  });
}

export function groupArticlesByCategory(
  articles: DocArticleSummary[]
): Record<DocCategory, DocArticleSummary[]> {
  const groups = {} as Record<DocCategory, DocArticleSummary[]>;
  for (const article of articles) {
    if (!groups[article.category]) groups[article.category] = [];
    groups[article.category].push(article);
  }
  for (const key of Object.keys(groups) as DocCategory[]) {
    groups[key].sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title));
  }
  return groups;
}

export const DOC_CATEGORY_ORDER: DocCategory[] = [
  'Getting Started',
  'Your Plan',
  'Using NiskBuild',
  'Importing Apps',
  'Exporting to App Store',
];

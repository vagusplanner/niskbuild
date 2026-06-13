import type { ProjectSeoSettings } from '@/lib/seo-types';

export type SeoScoreBreakdown = {
  title: number;
  metaDescription: number;
  ogImage: number;
  schema: number;
  keywordInTitle: number;
  total: number;
};

export function computeSeoScore(settings: Pick<
  ProjectSeoSettings,
  'title' | 'metaDescription' | 'focusKeyword' | 'ogImageUrl' | 'schemaJson'
>): SeoScoreBreakdown {
  const title = settings.title.trim().length >= 10 && settings.title.trim().length <= 60 ? 20 : 0;
  const metaDescription =
    settings.metaDescription.trim().length >= 50 && settings.metaDescription.trim().length <= 160
      ? 20
      : 0;
  const ogImage = settings.ogImageUrl.trim().length > 8 ? 20 : 0;
  const schema =
    settings.schemaJson && Object.keys(settings.schemaJson).length > 2 ? 20 : 0;
  const keyword = settings.focusKeyword.trim().toLowerCase();
  const keywordInTitle =
    keyword.length > 2 && settings.title.toLowerCase().includes(keyword) ? 20 : 0;

  const total = title + metaDescription + ogImage + schema + keywordInTitle;
  return { title, metaDescription, ogImage, schema, keywordInTitle, total };
}

export function seoScoreColor(score: number): 'red' | 'amber' | 'green' {
  if (score >= 71) return 'green';
  if (score >= 41) return 'amber';
  return 'red';
}

export function seoScoreTip(breakdown: SeoScoreBreakdown): string {
  if (breakdown.metaDescription < 20) {
    return 'Add a meta description (50–160 characters) to improve your score.';
  }
  if (breakdown.title < 20) {
    return 'Add a page title (10–60 characters) to improve your score.';
  }
  if (breakdown.ogImage < 20) {
    return 'Add an OG image URL for better social sharing and SEO.';
  }
  if (breakdown.keywordInTitle < 20) {
    return 'Include your focus keyword in the page title.';
  }
  if (breakdown.schema < 20) {
    return 'Add schema markup (Agency+) to reach a higher score.';
  }
  return 'Great work — your SEO basics look solid.';
}

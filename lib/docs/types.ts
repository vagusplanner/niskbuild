export const DOC_CATEGORIES = [
  'Getting Started',
  'Using NiskBuild',
  'Exporting to App Store',
  'Importing Apps',
  'Your Plan',
  'product',
  'plans',
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export type DocArticleStatus = 'draft' | 'published';

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  content: string;
  plan_visibility: string[];
  order_index: number;
  updated_at: string;
  /** Seed articles are treated as published when status is absent. */
  status?: DocArticleStatus;
}

export interface DocArticleSummary {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  plan_visibility: string[];
  order_index: number;
  updated_at: string;
  status?: DocArticleStatus;
}

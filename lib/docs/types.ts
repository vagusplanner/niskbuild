export const DOC_CATEGORIES = [
  'Getting Started',
  'Using NiskBuild',
  'Exporting to App Store',
  'Importing Apps',
  'Your Plan',
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  content: string;
  plan_visibility: string[];
  order_index: number;
  updated_at: string;
}

export interface DocArticleSummary {
  id: string;
  slug: string;
  title: string;
  category: DocCategory;
  plan_visibility: string[];
  order_index: number;
  updated_at: string;
}

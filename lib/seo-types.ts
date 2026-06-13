export type SeoSchemaType =
  | 'local_business'
  | 'restaurant'
  | 'ecommerce'
  | 'saas'
  | 'portfolio'
  | 'blog'
  | 'event';

export const SEO_SCHEMA_OPTIONS: { id: SeoSchemaType; label: string }[] = [
  { id: 'local_business', label: 'Local Business' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'ecommerce', label: 'E-commerce Store' },
  { id: 'saas', label: 'SaaS App' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'blog', label: 'Blog' },
  { id: 'event', label: 'Event' },
];

export type ProjectSeoSettings = {
  title: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  schemaType: SeoSchemaType;
  schemaJson: Record<string, unknown> | null;
  noindex: boolean;
  sitemapEnabled: boolean;
  robotsEnabled: boolean;
  seoScore: number;
};

export const DEFAULT_SEO_SETTINGS: ProjectSeoSettings = {
  title: '',
  metaDescription: '',
  focusKeyword: '',
  canonicalUrl: '',
  ogTitle: '',
  ogDescription: '',
  ogImageUrl: '',
  schemaType: 'saas',
  schemaJson: null,
  noindex: false,
  sitemapEnabled: true,
  robotsEnabled: true,
  seoScore: 0,
};

export type SeoAiSuggestion = {
  title: string;
  metaDescription: string;
  focusKeyword: string;
  ogTitle: string;
  ogDescription: string;
  suggestedSchema: Record<string, unknown>;
};

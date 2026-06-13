import type { SeoSchemaType } from '@/lib/seo-types';

type SchemaInput = {
  name: string;
  description?: string;
  url?: string;
  image?: string;
};

export function buildSchemaJson(type: SeoSchemaType, input: SchemaInput): Record<string, unknown> {
  const base = {
    '@context': 'https://schema.org',
    name: input.name,
    description: input.description || undefined,
    url: input.url || undefined,
    image: input.image || undefined,
  };

  switch (type) {
    case 'local_business':
      return { ...base, '@type': 'LocalBusiness' };
    case 'restaurant':
      return { ...base, '@type': 'Restaurant', servesCuisine: 'Various' };
    case 'ecommerce':
      return { ...base, '@type': 'Store' };
    case 'saas':
      return { ...base, '@type': 'SoftwareApplication', applicationCategory: 'BusinessApplication' };
    case 'portfolio':
      return { ...base, '@type': 'CreativeWork' };
    case 'blog':
      return { ...base, '@type': 'Blog' };
    case 'event':
      return { ...base, '@type': 'Event', eventStatus: 'https://schema.org/EventScheduled' };
    default:
      return { ...base, '@type': 'WebSite' };
  }
}

export type TemplateComplexity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  price: number;
  complexity: TemplateComplexity;
  downloads: number;
  author: string;
  category: string;
  featured: boolean;
  createdAt: string;
}

export function complexityLabel(complexity: TemplateComplexity | number): string {
  const c = complexity as TemplateComplexity;
  if (c <= 2) return 'Starter';
  if (c <= 4) return 'Essential';
  if (c <= 6) return 'Professional';
  if (c <= 8) return 'Advanced';
  return 'Enterprise';
}

export function formatTemplatePrice(price: number): string {
  return price === 0 ? 'Free' : `$${price}`;
}

/** Agency+ subscribers unlock the full marketplace */
export const MARKETPLACE_UNLOCK_TIERS = [
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export function listingIncludedInTier(
  listing: Pick<MarketplaceTemplate, 'id' | 'price'>,
  tier: string,
  legacyPurchasedIds: string[]
): boolean {
  if (listing.price === 0) return true;
  if (MARKETPLACE_UNLOCK_TIERS.includes(tier as (typeof MARKETPLACE_UNLOCK_TIERS)[number])) {
    return true;
  }
  return legacyPurchasedIds.includes(listing.id);
}

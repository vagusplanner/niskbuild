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

export type PriceTierId = 'all' | 'free' | 'essential' | 'pro' | 'advanced' | 'enterprise';

export const PRICE_TIER_BUCKETS: {
  id: PriceTierId;
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
}[] = [
  {
    id: 'free',
    label: 'Free',
    range: '2 starters',
    min: 0,
    max: 0,
    color: 'text-[var(--copper-melt)] border-[var(--copper-primary)]/30',
  },
  {
    id: 'essential',
    label: '$9–$19',
    range: 'Essential',
    min: 9,
    max: 19,
    color: 'text-[var(--copper-light)] border-[var(--copper-light)]/30',
  },
  {
    id: 'pro',
    label: '$25–$29',
    range: 'Pro',
    min: 25,
    max: 29,
    color: 'text-[var(--primary)] border-[var(--primary)]/30',
  },
  {
    id: 'advanced',
    label: '$35–$42',
    range: 'Advanced',
    min: 35,
    max: 42,
    color: 'text-[var(--secondary)] border-[var(--secondary)]/30',
  },
  {
    id: 'enterprise',
    label: '$49',
    range: 'Enterprise',
    min: 49,
    max: 9999,
    color: 'text-[var(--ember)] border-[var(--ember)]/30',
  },
];

export function matchesPriceTier(price: number, tierId: PriceTierId): boolean {
  if (tierId === 'all') return true;
  const bucket = PRICE_TIER_BUCKETS.find((b) => b.id === tierId);
  if (!bucket) return true;
  return price >= bucket.min && price <= bucket.max;
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

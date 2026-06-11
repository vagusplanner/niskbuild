import 'server-only';

const TIER_ENV_KEYS: Record<string, string[]> = {
  pro: ['STRIPE_PRO_PRICE_ID', 'NEXT_PUBLIC_STRIPE_PRO_PRICE_ID', 'NEXT_PUBLIC_STRIPE_PRICE_ID'],
  agency: ['STRIPE_AGENCY_PRICE_ID', 'NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID'],
  scale: ['STRIPE_SCALE_PRICE_ID', 'NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID'],
  white_label: ['STRIPE_WHITE_PRICE_ID', 'NEXT_PUBLIC_STRIPE_WHITE_PRICE_ID'],
  team_enterprise: [
    'STRIPE_TEAM_ENTERPRISE_PRICE_ID',
    'NEXT_PUBLIC_STRIPE_TEAM_ENTERPRISE_PRICE_ID',
  ],
  sovereign: ['STRIPE_SOVEREIGN_PRICE_ID', 'NEXT_PUBLIC_STRIPE_SOVEREIGN_PRICE_ID'],
};

function readPriceId(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function getStripePriceId(tier: string | null | undefined): string | null {
  if (!tier) return null;
  const keys = TIER_ENV_KEYS[tier];
  if (!keys) return null;
  return readPriceId(keys);
}

export function isSelfServeCheckoutTier(tier: string | null | undefined): boolean {
  return !!getStripePriceId(tier);
}

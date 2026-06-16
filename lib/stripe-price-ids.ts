import 'server-only';

import { PACK_ID_TO_BOOST } from '@/lib/reload-packs';

function env(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

type TierPrefix =
  | 'BASIC'
  | 'PRO'
  | 'AGENCY'
  | 'SCALE'
  | 'WHITE_LABEL'
  | 'TEAM_ENTERPRISE'
  | 'SOVEREIGN';

/** Maps tier slugs in code to STRIPE_PRICE_IDS key prefixes */
const TIER_KEY_PREFIX: Record<string, TierPrefix> = {
  basic: 'BASIC',
  pro: 'PRO',
  agency: 'AGENCY',
  scale: 'SCALE',
  white_label: 'WHITE_LABEL',
  team_enterprise: 'TEAM_ENTERPRISE',
  sovereign: 'SOVEREIGN',
};

export type PriceInterval = 'month' | 'year';

export const STRIPE_PRICE_IDS = {
  // Monthly — reads actual .env keys (WL/ENT/SOV) with spec-name fallbacks
  BASIC_MONTHLY: env('NEXT_PUBLIC_STRIPE_BASIC_MONTHLY'),
  PRO_MONTHLY: env(
    'NEXT_PUBLIC_STRIPE_PRO_MONTHLY',
    'NEXT_PUBLIC_STRIPE_PRICE_ID'
  ),
  AGENCY_MONTHLY: env('NEXT_PUBLIC_STRIPE_AGENCY_MONTHLY'),
  SCALE_MONTHLY: env('NEXT_PUBLIC_STRIPE_SCALE_MONTHLY'),
  WHITE_LABEL_MONTHLY: env(
    'NEXT_PUBLIC_STRIPE_WL_MONTHLY',
    'NEXT_PUBLIC_STRIPE_WHITE_LABEL_MONTHLY'
  ),
  TEAM_ENTERPRISE_MONTHLY: env(
    'NEXT_PUBLIC_STRIPE_ENT_MONTHLY',
    'NEXT_PUBLIC_STRIPE_TEAM_ENTERPRISE_MONTHLY'
  ),
  SOVEREIGN_MONTHLY: env(
    'NEXT_PUBLIC_STRIPE_SOV_MONTHLY',
    'NEXT_PUBLIC_STRIPE_SOVEREIGN_MONTHLY'
  ),

  // Annual
  BASIC_ANNUAL: env('NEXT_PUBLIC_STRIPE_BASIC_ANNUAL'),
  PRO_ANNUAL: env('NEXT_PUBLIC_STRIPE_PRO_ANNUAL'),
  AGENCY_ANNUAL: env('NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL'),
  SCALE_ANNUAL: env('NEXT_PUBLIC_STRIPE_SCALE_ANNUAL'),
  WHITE_LABEL_ANNUAL: env(
    'NEXT_PUBLIC_STRIPE_WL_ANNUAL',
    'NEXT_PUBLIC_STRIPE_WHITE_LABEL_ANNUAL'
  ),
  TEAM_ENTERPRISE_ANNUAL: env(
    'NEXT_PUBLIC_STRIPE_ENT_ANNUAL',
    'NEXT_PUBLIC_STRIPE_TEAM_ENTERPRISE_ANNUAL'
  ),
  SOVEREIGN_ANNUAL: env(
    'NEXT_PUBLIC_STRIPE_SOV_ANNUAL',
    'NEXT_PUBLIC_STRIPE_SOVEREIGN_ANNUAL'
  ),

  // Reload packs
  LIGHT_BOOST: env('NEXT_PUBLIC_STRIPE_LIGHT_BOOST'),
  MID_BOOST: env('NEXT_PUBLIC_STRIPE_MID_BOOST'),
  SPRINT_BOOST: env('NEXT_PUBLIC_STRIPE_SPRINT_BOOST'),
  POWER_BOOST: env('NEXT_PUBLIC_STRIPE_POWER_BOOST'),

  // Sovereign one-time setup
  SOVEREIGN_SETUP: env(
    'NEXT_PUBLIC_STRIPE_SOV_SETUP',
    'NEXT_PUBLIC_STRIPE_SOVEREIGN_SETUP'
  ),
} as const;

export type ReloadBoost = 'light' | 'mid' | 'sprint' | 'power';

const BOOST_TO_KEY: Record<ReloadBoost, keyof typeof STRIPE_PRICE_IDS> = {
  light: 'LIGHT_BOOST',
  mid: 'MID_BOOST',
  sprint: 'SPRINT_BOOST',
  power: 'POWER_BOOST',
};

export function normalizePriceInterval(value: unknown): PriceInterval {
  if (value === 'year' || value === 'annual') return 'year';
  return 'month';
}

export function getPriceId(tier: string, interval: PriceInterval = 'month'): string | null {
  const prefix = TIER_KEY_PREFIX[tier];
  if (!prefix) return null;
  const suffix = interval === 'year' ? 'ANNUAL' : 'MONTHLY';
  const key = `${prefix}_${suffix}` as keyof typeof STRIPE_PRICE_IDS;
  return STRIPE_PRICE_IDS[key] ?? null;
}

export function getReloadPriceId(boost: ReloadBoost): string | null {
  return STRIPE_PRICE_IDS[BOOST_TO_KEY[boost]] ?? null;
}

export function getReloadPriceIdByPackId(packId: string): string | null {
  const boost = PACK_ID_TO_BOOST[packId];
  return boost ? getReloadPriceId(boost) : null;
}

export function getSovereignSetupPriceId(): string | null {
  return STRIPE_PRICE_IDS.SOVEREIGN_SETUP ?? null;
}

export function isSelfServeCheckoutTier(tier: string | null | undefined): boolean {
  return !!getPriceId(tier || '', 'month');
}

/**
 * Per-credit cost must exceed subscription rate to drive upgrades.
 * Basic sub: ~$0.460/cr · Pro Worker: ~$0.215/cr · Agency: ~$0.120/cr
 */
export const RELOAD_PACKS = [
  {
    id: 'boost_100',
    name: 'Light Boost',
    credits: 100,
    priceUsd: 15,
    pricePerCredit: '$0.150',
    description: 'Light top-up — higher per-credit than Basic',
  },
  {
    id: 'boost_250',
    name: 'Mid Boost',
    credits: 250,
    priceUsd: 35,
    pricePerCredit: '$0.140',
    description: 'Mid-month refill — upgrading beats repeat buys',
  },
  {
    id: 'boost_500',
    name: 'Sprint Boost',
    credits: 500,
    priceUsd: 65,
    pricePerCredit: '$0.130',
    description: 'Sprint pack for busy weeks',
  },
  {
    id: 'boost_1000',
    name: 'Power Boost',
    credits: 1000,
    priceUsd: 125,
    pricePerCredit: '$0.125',
    description: 'Large burst — Agency Studio is better long-term value',
  },
] as const;

export type ReloadPack = (typeof RELOAD_PACKS)[number];

/** Maps pack IDs to Stripe boost slugs (used by checkout) */
export const PACK_ID_TO_BOOST: Record<string, 'light' | 'mid' | 'sprint' | 'power'> = {
  boost_100: 'light',
  boost_250: 'mid',
  boost_500: 'sprint',
  boost_1000: 'power',
};

export function getReloadPack(id: string): ReloadPack | undefined {
  return RELOAD_PACKS.find((p) => p.id === id);
}

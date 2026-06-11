export interface ReloadPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  /** Display string e.g. "$0.150" */
  pricePerCredit: string;
  description: string;
}

/**
 * Per-credit cost must exceed subscription rate to drive upgrades.
 * Pro sub: ~$0.115/cr · Agency: ~$0.080/cr · Scale: ~$0.055/cr
 */
export const RELOAD_PACKS: ReloadPack[] = [
  {
    id: 'boost_100',
    name: 'Boost 100',
    credits: 100,
    priceUsd: 15,
    pricePerCredit: '$0.150',
    description: 'Light top-up — higher per-credit than Pro',
  },
  {
    id: 'boost_250',
    name: 'Boost 250',
    credits: 250,
    priceUsd: 35,
    pricePerCredit: '$0.140',
    description: 'Mid-month refill — upgrading beats repeat buys',
  },
  {
    id: 'boost_500',
    name: 'Boost 500',
    credits: 500,
    priceUsd: 65,
    pricePerCredit: '$0.130',
    description: 'Sprint pack for busy weeks',
  },
  {
    id: 'boost_1000',
    name: 'Boost 1000',
    credits: 1000,
    priceUsd: 125,
    pricePerCredit: '$0.125',
    description: 'Large burst — Agency plan is better long-term value',
  },
];

export function getReloadPack(id: string): ReloadPack | undefined {
  return RELOAD_PACKS.find((p) => p.id === id);
}

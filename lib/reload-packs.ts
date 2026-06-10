export interface ReloadPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  description: string;
}

/** Per-credit cost must exceed subscription rate to drive upgrades */
export const RELOAD_PACKS: ReloadPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 200,
    priceUsd: 12,
    description: 'Quick top-up — same rate as Pro monthly',
  },
  {
    id: 'builder',
    name: 'Builder',
    credits: 500,
    priceUsd: 29,
    description: 'Mid-month boost for active freelancers',
  },
  {
    id: 'power',
    name: 'Power',
    credits: 1000,
    priceUsd: 55,
    description: 'Heavy sprint — still cheaper than 2× Agency',
  },
  {
    id: 'studio',
    name: 'Studio',
    credits: 2500,
    priceUsd: 129,
    description: 'Agency-scale burst without plan change',
  },
];

export function getReloadPack(id: string): ReloadPack | undefined {
  return RELOAD_PACKS.find((p) => p.id === id);
}

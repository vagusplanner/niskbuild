/** Canonical tier order (lowest → highest). Slug `free` = Sandbox. */
export const TIER_ORDER = [
  'free',
  'basic',
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export type TierSlug = (typeof TIER_ORDER)[number];

export function tierIndex(tier: string | null | undefined): number {
  const idx = TIER_ORDER.indexOf((tier || 'free') as TierSlug);
  return idx >= 0 ? idx : 0;
}

export function tierAtLeast(
  tier: string | null | undefined,
  minimum: TierSlug
): boolean {
  return tierIndex(tier) >= tierIndex(minimum);
}

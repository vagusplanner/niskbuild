export const PROJECT_LIMITS: Record<string, number> = {
  free: 1,
  basic: 5,
  pro: 15,
  agency: 25,
  scale: 999999,
  white_label: 999999,
  team_enterprise: 999999,
  sovereign: 999999,
};

export function getProjectLimit(tier: string | null | undefined): number {
  return PROJECT_LIMITS[tier || 'free'] ?? 1;
}

export function isUnlimitedTier(tier: string | null | undefined): boolean {
  return (
    tier === 'scale' ||
    tier === 'white_label' ||
    tier === 'team_enterprise' ||
    tier === 'sovereign'
  );
}

/** Max stored versions per plan (null = unlimited) */
export const VERSION_LIMITS: Record<string, number | null> = {
  free: 3,
  sandbox: 3,
  pro: 20,
  agency: 100,
  scale: null,
  white_label: null,
  team_enterprise: null,
  sovereign: null,
};

const COMPARE_TIERS = [
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export function getVersionLimit(tier: string | null | undefined): number | null {
  return VERSION_LIMITS[tier || 'free'] ?? 3;
}

export function canCompareVersions(tier: string | null | undefined): boolean {
  return COMPARE_TIERS.includes(tier as (typeof COMPARE_TIERS)[number]);
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export function slugifyProjectName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  );
}

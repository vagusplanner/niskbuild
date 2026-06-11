import { hasPaidTier, PAID_TIERS } from '@/lib/access';

/** Monthly cloud credit allowance per tier (reset on checkout / renewal webhook) */
export const CLOUD_CREDITS_BY_TIER: Record<string, number> = {
  free: 0,
  pro: 600,
  agency: 2500,
  scale: 10000,
  white_label: 15000,
  team_enterprise: 25000,
  sovereign: 50000,
};

const TIER_ORDER = [
  'free',
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

/** BYOC (bring your own API keys) — Agency+ only to prevent Pro revenue leak */
export const BYOC_TIERS = [
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

/** Local Ollama engine — Agency+ only (same tier gate as BYOC) */
export const LOCAL_OLLAMA_TIERS = BYOC_TIERS;

export const LOCAL_OLLAMA_LOCKED_MESSAGE =
  'Local AI engine is available on Agency plan and above. Upgrade to unlock unlimited local builds.';

export const LOCAL_OLLAMA_UPGRADE_CTA =
  'Unlock local AI — Agency plan from $199/month.';

export const LOCAL_OLLAMA_PRO_BANNER =
  'You are using NiskBuild cloud AI. Upgrade to Agency to connect your own Ollama engine and build locally for free.';

/** Max concurrent browser sessions per tier */
export const SESSION_LIMITS: Record<string, number> = {
  free: 1,
  sandbox: 1,
  pro: 2,
  agency: 3,
  scale: 5,
  white_label: 999999,
  team_enterprise: 10,
  sovereign: 999999,
};

export function getCloudCreditsForTier(tier: string | null | undefined): number {
  return CLOUD_CREDITS_BY_TIER[tier || 'free'] ?? 0;
}

export function getSessionLimit(tier: string | null | undefined): number {
  return SESSION_LIMITS[tier || 'free'] ?? 1;
}

export function getNextTier(tier: string): { tier: string; name: string; credits: number } | null {
  const idx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number]);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  const next = TIER_ORDER[idx + 1];
  if (next === 'free') return null;
  return {
    tier: next,
    name: tierDisplayName(next),
    credits: getCloudCreditsForTier(next),
  };
}

export function canUseOwnApiKeys(tier: string | null | undefined): boolean {
  return BYOC_TIERS.includes(tier as (typeof BYOC_TIERS)[number]);
}

export function canUseLocalOllama(tier: string | null | undefined): boolean {
  return LOCAL_OLLAMA_TIERS.includes(tier as (typeof LOCAL_OLLAMA_TIERS)[number]);
}

export function isSandboxTier(tier: string | null | undefined): boolean {
  return !tier || tier === 'free';
}

/** Sandbox may call local /api/generate (user-run Ollama); no cloud credits */
export function canUseSandboxLocalGenerate(tier: string | null | undefined): boolean {
  return isSandboxTier(tier);
}

export function isPaidAndActive(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return hasPaidTier(tier) && status === 'active';
}

export function canExportCleanZip(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status);
}

export function tierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    free: 'Sandbox',
    pro: 'Pro',
    agency: 'Agency',
    scale: 'Scale',
    white_label: 'White-Label',
    team_enterprise: 'Team Enterprise',
    sovereign: 'Sovereign',
  };
  return names[tier] || tier;
}

export { PAID_TIERS };

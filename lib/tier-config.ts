import { hasPaidTier, PAID_TIERS } from '@/lib/access';
import { TIER_ORDER, tierAtLeast, type TierSlug } from '@/lib/tier-rank';

export { PAID_TIERS, TIER_ORDER, tierAtLeast };

/** Monthly cloud credit allowance per tier (reset on checkout / renewal webhook) */
export const CLOUD_CREDITS_BY_TIER: Record<string, number> = {
  free: 5,
  basic: 150,
  pro: 600,
  agency: 2500,
  scale: 10000,
  white_label: 15000,
  team_enterprise: 25000,
  sovereign: 50000,
};

/** BYOC (bring your own API keys) — Pro Worker and above */
export const BYOC_TIERS = [
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

/** Local Ollama engine in builder — Pro Worker and above */
export const LOCAL_OLLAMA_TIERS = BYOC_TIERS;

export const LOCAL_OLLAMA_LOCKED_MESSAGE =
  'Local AI engine is available on Pro Worker plan and above. Upgrade to connect your own Ollama.';

export const LOCAL_OLLAMA_UPGRADE_CTA =
  'Unlock local AI — Pro Worker from $129/month.';

export const LOCAL_OLLAMA_PRO_BANNER =
  'You are using NiskBuild cloud AI. Upgrade to Pro Worker to connect your own Ollama engine and build locally for free.';

/** Max concurrent browser sessions per tier */
export const SESSION_LIMITS: Record<string, number> = {
  free: 1,
  sandbox: 1,
  basic: 2,
  pro: 5,
  agency: 10,
  scale: 20,
  white_label: 999999,
  team_enterprise: 999999,
  sovereign: 999999,
};

/** Team seats included per tier (0 = not available) */
export const TEAM_SEATS_BY_TIER: Record<string, number> = {
  free: 0,
  basic: 0,
  pro: 0,
  agency: 3,
  scale: 999999,
  white_label: 999999,
  team_enterprise: 999999,
  sovereign: 999999,
};

export function getCloudCreditsForTier(tier: string | null | undefined): number {
  return CLOUD_CREDITS_BY_TIER[tier || 'free'] ?? 0;
}

export function getSessionLimit(tier: string | null | undefined): number {
  return SESSION_LIMITS[tier || 'free'] ?? 1;
}

export function getTeamSeats(tier: string | null | undefined): number {
  return TEAM_SEATS_BY_TIER[tier || 'free'] ?? 0;
}

export function getNextTier(tier: string): { tier: string; name: string; credits: number } | null {
  const idx = TIER_ORDER.indexOf(tier as TierSlug);
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

export function isBasicTier(tier: string | null | undefined): boolean {
  return tier === 'basic';
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

/** Pro Worker tier and above (excludes Basic) */
export function isProWorkerOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status) && tierAtLeast(tier, 'pro');
}

/** Agency Studio tier and above */
export function isAgencyStudioOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status) && tierAtLeast(tier, 'agency');
}

/** White-Label tier and above */
export function isWhiteLabelOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status) && tierAtLeast(tier, 'white_label');
}

export function canExportCleanZip(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status);
}

/** PWA export — Basic plan and above */
export function canExportPwa(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status);
}

/** Google Places business import — Pro Worker and above (not Basic) */
export function canImportGooglePlaces(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isProWorkerOrAbove(tier, status);
}

/** Competitor comparison intel — Agency Studio and above */
export function canUseCompetitorIntel(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Social proof aggregator — Agency Studio and above */
export function canUseSocialProofAggregator(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Copy social posts — all authenticated plans */
export function canCopySocialPosts(): boolean {
  return true;
}

/** Direct publish + OAuth connect — Agency+ or Social Pro add-on */
export function canDirectPublishSocial(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false
): boolean {
  if (hasSocialProAddon) return true;
  return isAgencyStudioOrAbove(tier, status);
}

/** Schedule social posts — Scale+ or Social Pro add-on */
export function canScheduleSocialPosts(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false
): boolean {
  if (hasSocialProAddon) return true;
  return isPaidAndActive(tier, status) && tierAtLeast(tier, 'scale');
}

export function hasSocialProAddon(purchasedTemplates: unknown): boolean {
  if (!Array.isArray(purchasedTemplates)) return false;
  return purchasedTemplates.includes('social_pro');
}

/** Phaser.js game templates — Pro Worker and above */
export function canUseGameTemplates(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isProWorkerOrAbove(tier, status);
}

/** Native Capacitor export — Agency Studio and above */
export function canExportNative(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Subscriber mobile / App Store export pipeline — Pro Worker and above */
export function canExportMobileProject(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isProWorkerOrAbove(tier, status);
}

/** Visual CSS editor — Sandbox and all paid active tiers */
export function canUseVisualEditor(
  tier: string | null | undefined,
  status?: string | null | undefined
): boolean {
  if (isSandboxTier(tier)) return true;
  return isPaidAndActive(tier, status);
}

/** Mobile overrides, undo, and reset — Agency Studio and above */
export function canUseVisualEditorFull(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Save SEO settings — Basic plan and above */
export function canSaveSeoSettings(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status);
}

/** AI Generate SEO — Basic plan and above */
export function canGenerateSeoAi(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status);
}

/** JSON-LD schema editor — Agency Studio and above */
export function canUseSeoSchema(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Stripe one-click inject — Pro Worker and above */
export function canUseStripeInject(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isProWorkerOrAbove(tier, status);
}

/** Custom domain mapping — White-Label and above */
export function canUseCustomDomains(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isWhiteLabelOrAbove(tier, status);
}

/** Full white-label rebrand — White-Label and above */
export function canUseWhiteLabelBranding(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isWhiteLabelOrAbove(tier, status);
}

/** Coming-soon integration notify — Agency Studio and above */
export function canNotifyComingSoonIntegrations(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

/** Stripe revenue dashboard — Agency Studio and above */
export function canViewStripeRevenue(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isAgencyStudioOrAbove(tier, status);
}

export function tierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    free: 'Sandbox',
    basic: 'Basic',
    pro: 'Pro Worker',
    agency: 'Agency Studio',
    scale: 'Scale Team',
    white_label: 'White-Label',
    team_enterprise: 'Team Enterprise',
    sovereign: 'Sovereign',
  };
  return names[tier] || tier;
}

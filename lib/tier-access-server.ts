import 'server-only';

import {
  getAdminCompedGrantTier,
  isPlatformOwnerGatingActive,
  isProductGatingBypassActive,
  resolveProductGatingBypass,
} from '@/lib/platform-owner-bypass';
import * as tierConfig from '@/lib/tier-config';
import {
  SESSION_LIMITS,
  TEAM_SEATS_BY_TIER,
} from '@/lib/tier-config';
import {
  PROJECT_LIMITS,
  getProjectLimit as baseGetProjectLimit,
  isUnlimitedTier as baseIsUnlimitedTier,
} from '@/lib/project-limits';
import { canUseSupportTickets as baseCanUseSupportTickets } from '@/lib/support-access';

/**
 * Explicit owner-bypass flag for sync tier helpers.
 * Prefer: `const bypass = await resolveProductGatingBypass(userId)` after auth,
 * then pass `bypass` into these helpers. Do not rely on ALS alone after awaits.
 *
 * `true` means platform owner OR active admin_comped. Feature helpers unlock
 * sovereign only for platform owners; admin_comped uses access_grant_tier.
 */
export type OwnerBypass = boolean | undefined;

/** Re-export for call-site convenience (userId-aware; survives ALS loss). */
export { resolveProductGatingBypass };

/** Effective tier for limit/feature checks when admin_comped is active. */
function effectiveTier(tier: string | null | undefined): string | null | undefined {
  return getAdminCompedGrantTier() || tier;
}

function allow(allowed: boolean, bypass?: OwnerBypass): boolean {
  if (isPlatformOwnerGatingActive()) return true;
  // admin_comped: paid access via grant tier — do not unlock all sovereign features
  if (getAdminCompedGrantTier()) return allowed;
  return bypass === true || isProductGatingBypassActive() || allowed;
}

function unlimitedOwner(_bypass?: OwnerBypass): boolean {
  // Sovereign limits only for platform owners (ALS). Bare bypass=true also covers
  // admin_comped — do NOT treat that as unlimited (would over-entitle grant tiers).
  if (isPlatformOwnerGatingActive()) return true;
  return false;
}

export {
  CLOUD_CREDITS_BY_TIER,
  getCloudCreditsForTier,
  tierDisplayName,
  getNextTier,
  isBasicTier,
  hasSocialProAddon,
  SESSION_LIMITS,
  LOCAL_OLLAMA_LOCKED_MESSAGE,
  LOCAL_OLLAMA_UPGRADE_CTA,
  LOCAL_OLLAMA_PRO_BANNER,
} from '@/lib/tier-config';

export function getProjectLimit(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): number {
  if (unlimitedOwner(bypass)) return PROJECT_LIMITS.sovereign;
  return baseGetProjectLimit(effectiveTier(tier));
}

export function isUnlimitedTier(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (unlimitedOwner(bypass)) return true;
  return baseIsUnlimitedTier(effectiveTier(tier));
}

export function getSessionLimit(
  tierName: string | null | undefined,
  bypass?: OwnerBypass
): number {
  if (unlimitedOwner(bypass)) return SESSION_LIMITS.sovereign;
  return tierConfig.getSessionLimit(effectiveTier(tierName));
}

export function getTeamSeats(
  tierName: string | null | undefined,
  bypass?: OwnerBypass
): number {
  if (unlimitedOwner(bypass)) return TEAM_SEATS_BY_TIER.sovereign;
  return tierConfig.getTeamSeats(effectiveTier(tierName));
}

export function canUseSupportTickets(
  tier: string | null | undefined,
  status?: string,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  if (getAdminCompedGrantTier()) {
    return baseCanUseSupportTickets(t, status ?? 'active');
  }
  return allow(baseCanUseSupportTickets(tier, status), bypass);
}

export function isSandboxTier(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (unlimitedOwner(bypass) || getAdminCompedGrantTier()) return false;
  return tierConfig.isSandboxTier(tier);
}

export function isPaidAndActive(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (isPlatformOwnerGatingActive()) return true;
  if (getAdminCompedGrantTier()) return true;
  return allow(tierConfig.isPaidAndActive(tier, status), bypass);
}

export function isProWorkerOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.isProWorkerOrAbove(t, s), bypass);
}

export function isAgencyStudioOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.isAgencyStudioOrAbove(t, s), bypass);
}

export function isWhiteLabelOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.isWhiteLabelOrAbove(t, s), bypass);
}

export function isTeamEnterpriseOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.isTeamEnterpriseOrAbove(t, s), bypass);
}

export function canUseOwnApiKeys(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseOwnApiKeys(effectiveTier(tier)), bypass);
}

export function canUseLocalOllama(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseLocalOllama(effectiveTier(tier)), bypass);
}

export function canUseSandboxLocalGenerate(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (unlimitedOwner(bypass)) return true;
  if (getAdminCompedGrantTier()) return true;
  return tierConfig.canUseSandboxLocalGenerate(tier);
}

export function canExportCleanZip(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canExportCleanZip(t, s), bypass);
}

export function canExportPwa(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canExportPwa(t, s), bypass);
}

export function canImportGooglePlaces(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canImportGooglePlaces(t, s), bypass);
}

export function canUseCompetitorIntel(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseCompetitorIntel(t, s), bypass);
}

export function canUseSocialProofAggregator(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseSocialProofAggregator(t, s), bypass);
}

export function canDirectPublishSocial(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canDirectPublishSocial(t, s, hasSocialProAddon), bypass);
}

export function canScheduleSocialPosts(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canScheduleSocialPosts(t, s, hasSocialProAddon), bypass);
}

export function canCopySocialPosts(): boolean {
  return tierConfig.canCopySocialPosts();
}

export function canUseGameTemplates(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseGameTemplates(t, s), bypass);
}

export function canExportNative(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canExportNative(t, s), bypass);
}

export function canExportMobileProject(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canExportMobileProject(t, s), bypass);
}

export function canUseVisualEditor(
  tier: string | null | undefined,
  status?: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseVisualEditor(t, s), bypass);
}

export function canUseVisualEditorFull(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseVisualEditorFull(t, s), bypass);
}

export function canSaveSeoSettings(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canSaveSeoSettings(t, s), bypass);
}

export function canGenerateSeoAi(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canGenerateSeoAi(t, s), bypass);
}

export function canUseSeoSchema(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseSeoSchema(t, s), bypass);
}

export function canUseStripeInject(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseStripeInject(t, s), bypass);
}

export function canUseCustomDomains(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseCustomDomains(t, s), bypass);
}

export function canUseWhiteLabelBranding(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseWhiteLabelBranding(t, s), bypass);
}

export function canUseOrgSso(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canUseOrgSso(t, s), bypass);
}

export function canNotifyComingSoonIntegrations(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canNotifyComingSoonIntegrations(t, s), bypass);
}

export function canViewStripeRevenue(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  const t = effectiveTier(tier);
  const s = getAdminCompedGrantTier() ? 'active' : status;
  return allow(tierConfig.canViewStripeRevenue(t, s), bypass);
}

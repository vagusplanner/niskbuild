import 'server-only';

import {
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
 */
export type OwnerBypass = boolean | undefined;

/** Re-export for call-site convenience (userId-aware; survives ALS loss). */
export { resolveProductGatingBypass };

function allow(allowed: boolean, bypass?: OwnerBypass): boolean {
  return bypass === true || isProductGatingBypassActive() || allowed;
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
  if (bypass === true || isProductGatingBypassActive()) return PROJECT_LIMITS.sovereign;
  return baseGetProjectLimit(tier);
}

export function isUnlimitedTier(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (bypass === true || isProductGatingBypassActive()) return true;
  return baseIsUnlimitedTier(tier);
}

export function getSessionLimit(
  tierName: string | null | undefined,
  bypass?: OwnerBypass
): number {
  if (bypass === true || isProductGatingBypassActive()) return SESSION_LIMITS.sovereign;
  return tierConfig.getSessionLimit(tierName);
}

export function getTeamSeats(
  tierName: string | null | undefined,
  bypass?: OwnerBypass
): number {
  if (bypass === true || isProductGatingBypassActive()) return TEAM_SEATS_BY_TIER.sovereign;
  return tierConfig.getTeamSeats(tierName);
}

export function canUseSupportTickets(
  tier: string | null | undefined,
  status?: string,
  bypass?: OwnerBypass
): boolean {
  return allow(baseCanUseSupportTickets(tier, status), bypass);
}

export function isSandboxTier(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (bypass === true || isProductGatingBypassActive()) return false;
  return tierConfig.isSandboxTier(tier);
}

export function isPaidAndActive(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.isPaidAndActive(tier, status), bypass);
}

export function isProWorkerOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.isProWorkerOrAbove(tier, status), bypass);
}

export function isAgencyStudioOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.isAgencyStudioOrAbove(tier, status), bypass);
}

export function isWhiteLabelOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.isWhiteLabelOrAbove(tier, status), bypass);
}

export function isTeamEnterpriseOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.isTeamEnterpriseOrAbove(tier, status), bypass);
}

export function canUseOwnApiKeys(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseOwnApiKeys(tier), bypass);
}

export function canUseLocalOllama(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseLocalOllama(tier), bypass);
}

export function canUseSandboxLocalGenerate(
  tier: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  if (bypass === true || isProductGatingBypassActive()) return true;
  return tierConfig.canUseSandboxLocalGenerate(tier);
}

export function canExportCleanZip(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canExportCleanZip(tier, status), bypass);
}

export function canExportPwa(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canExportPwa(tier, status), bypass);
}

export function canImportGooglePlaces(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canImportGooglePlaces(tier, status), bypass);
}

export function canUseCompetitorIntel(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseCompetitorIntel(tier, status), bypass);
}

export function canUseSocialProofAggregator(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseSocialProofAggregator(tier, status), bypass);
}

export function canDirectPublishSocial(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canDirectPublishSocial(tier, status, hasSocialProAddon), bypass);
}

export function canScheduleSocialPosts(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canScheduleSocialPosts(tier, status, hasSocialProAddon), bypass);
}

export function canCopySocialPosts(): boolean {
  return tierConfig.canCopySocialPosts();
}

export function canUseGameTemplates(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseGameTemplates(tier, status), bypass);
}

export function canExportNative(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canExportNative(tier, status), bypass);
}

export function canExportMobileProject(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canExportMobileProject(tier, status), bypass);
}

export function canUseVisualEditor(
  tier: string | null | undefined,
  status?: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseVisualEditor(tier, status), bypass);
}

export function canUseVisualEditorFull(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseVisualEditorFull(tier, status), bypass);
}

export function canSaveSeoSettings(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canSaveSeoSettings(tier, status), bypass);
}

export function canGenerateSeoAi(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canGenerateSeoAi(tier, status), bypass);
}

export function canUseSeoSchema(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseSeoSchema(tier, status), bypass);
}

export function canUseStripeInject(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseStripeInject(tier, status), bypass);
}

export function canUseCustomDomains(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseCustomDomains(tier, status), bypass);
}

export function canUseWhiteLabelBranding(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseWhiteLabelBranding(tier, status), bypass);
}

export function canUseOrgSso(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canUseOrgSso(tier, status), bypass);
}

export function canNotifyComingSoonIntegrations(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canNotifyComingSoonIntegrations(tier, status), bypass);
}

export function canViewStripeRevenue(
  tier: string | null | undefined,
  status: string | null | undefined,
  bypass?: OwnerBypass
): boolean {
  return allow(tierConfig.canViewStripeRevenue(tier, status), bypass);
}

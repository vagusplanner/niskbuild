import 'server-only';

import { isProductGatingBypassActive } from '@/lib/platform-owner-bypass';
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

function allow(allowed: boolean): boolean {
  return isProductGatingBypassActive() || allowed;
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

export function getProjectLimit(tier: string | null | undefined): number {
  if (isProductGatingBypassActive()) return PROJECT_LIMITS.sovereign;
  return baseGetProjectLimit(tier);
}

export function isUnlimitedTier(tier: string | null | undefined): boolean {
  if (isProductGatingBypassActive()) return true;
  return baseIsUnlimitedTier(tier);
}

export function getSessionLimit(tierName: string | null | undefined): number {
  if (isProductGatingBypassActive()) return SESSION_LIMITS.sovereign;
  return tierConfig.getSessionLimit(tierName);
}

export function getTeamSeats(tierName: string | null | undefined): number {
  if (isProductGatingBypassActive()) return TEAM_SEATS_BY_TIER.sovereign;
  return tierConfig.getTeamSeats(tierName);
}

export function canUseSupportTickets(
  tier: string | null | undefined,
  status?: string
): boolean {
  return allow(baseCanUseSupportTickets(tier, status));
}

export function isSandboxTier(tier: string | null | undefined): boolean {
  if (isProductGatingBypassActive()) return false;
  return tierConfig.isSandboxTier(tier);
}

export function isPaidAndActive(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.isPaidAndActive(tier, status));
}

export function isProWorkerOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.isProWorkerOrAbove(tier, status));
}

export function isAgencyStudioOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.isAgencyStudioOrAbove(tier, status));
}

export function isWhiteLabelOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.isWhiteLabelOrAbove(tier, status));
}

export function isTeamEnterpriseOrAbove(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.isTeamEnterpriseOrAbove(tier, status));
}

export function canUseOwnApiKeys(tier: string | null | undefined): boolean {
  return allow(tierConfig.canUseOwnApiKeys(tier));
}

export function canUseLocalOllama(tier: string | null | undefined): boolean {
  return allow(tierConfig.canUseLocalOllama(tier));
}

export function canUseSandboxLocalGenerate(tier: string | null | undefined): boolean {
  if (isProductGatingBypassActive()) return true;
  return tierConfig.canUseSandboxLocalGenerate(tier);
}

export function canExportCleanZip(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canExportCleanZip(tier, status));
}

export function canExportPwa(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canExportPwa(tier, status));
}

export function canImportGooglePlaces(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canImportGooglePlaces(tier, status));
}

export function canUseCompetitorIntel(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseCompetitorIntel(tier, status));
}

export function canUseSocialProofAggregator(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseSocialProofAggregator(tier, status));
}

export function canDirectPublishSocial(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false
): boolean {
  return allow(tierConfig.canDirectPublishSocial(tier, status, hasSocialProAddon));
}

export function canScheduleSocialPosts(
  tier: string | null | undefined,
  status: string | null | undefined,
  hasSocialProAddon = false
): boolean {
  return allow(tierConfig.canScheduleSocialPosts(tier, status, hasSocialProAddon));
}

export function canCopySocialPosts(): boolean {
  return tierConfig.canCopySocialPosts();
}

export function canUseGameTemplates(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseGameTemplates(tier, status));
}

export function canExportNative(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canExportNative(tier, status));
}

export function canExportMobileProject(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canExportMobileProject(tier, status));
}

export function canUseVisualEditor(
  tier: string | null | undefined,
  status?: string | null | undefined
): boolean {
  return allow(tierConfig.canUseVisualEditor(tier, status));
}

export function canUseVisualEditorFull(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseVisualEditorFull(tier, status));
}

export function canSaveSeoSettings(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canSaveSeoSettings(tier, status));
}

export function canGenerateSeoAi(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canGenerateSeoAi(tier, status));
}

export function canUseSeoSchema(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseSeoSchema(tier, status));
}

export function canUseStripeInject(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseStripeInject(tier, status));
}

export function canUseCustomDomains(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseCustomDomains(tier, status));
}

export function canUseWhiteLabelBranding(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseWhiteLabelBranding(tier, status));
}

export function canUseOrgSso(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canUseOrgSso(tier, status));
}

export function canNotifyComingSoonIntegrations(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canNotifyComingSoonIntegrations(tier, status));
}

export function canViewStripeRevenue(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return allow(tierConfig.canViewStripeRevenue(tier, status));
}

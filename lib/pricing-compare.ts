import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import { hasPaidTier } from '@/lib/access';
import { canUseSupportTickets } from '@/lib/support-access';
import {
  CLOUD_CREDITS_BY_TIER,
  SESSION_LIMITS,
  TEAM_SEATS_BY_TIER,
  canExportCleanZip,
  canExportMobileProject,
  canExportNative,
  canExportPwa,
  canImportGooglePlaces,
  canScheduleSocialPosts,
  canUseCompetitorIntel,
  canUseCustomDomains,
  canUseGameTemplates,
  canUseLocalOllama,
  canUseOwnApiKeys,
  canUseWhiteLabelBranding,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';
import { getProjectLimit, isUnlimitedTier } from '@/lib/project-limits';

/** Active subscription assumed for paid-tier gating in the comparison matrix. */
const ACTIVE = 'active';

export type CompareCell = string | boolean;

export type CompareRow = {
  label: string;
  /** Values aligned with PRICING_TIERS column order */
  values: CompareCell[];
};

/**
 * Short column taglines for the comparison page.
 * FLAG FOR REVIEW — marketing copy derived from each tier's feature set.
 */
export const TIER_COMPARE_TAGLINES: Record<string, string> = {
  Sandbox: 'Try it free — no card, just a quick phone verification.',
  Basic: 'Solo freelancers who need clean exports and PWA',
  'Pro Worker': 'Power users — BYOC, Places AI, games, and 4× credits',
  'Agency Studio': 'Studios shipping client work with seats and native export',
  'Scale Team': 'Growing teams that need volume, seats, and scheduled social',
  'White-Label': 'Resellers who need full rebrand and custom domains',
  'Team Enterprise': 'Mid-size companies needing SLA-grade support',
  Sovereign: 'For organizations needing dedicated infrastructure, compliance, and full data isolation.',
};

function formatProjects(tierKey: string | null): string {
  const key = tierKey || 'free';
  if (isUnlimitedTier(key)) return 'Unlimited';
  return String(getProjectLimit(key));
}

function formatSessions(tierKey: string | null): string {
  const key = tierKey || 'free';
  const n = SESSION_LIMITS[key] ?? SESSION_LIMITS.free;
  return n >= 999999 ? 'Unlimited' : String(n);
}

function formatCredits(tierKey: string | null): string {
  const key = tierKey || 'free';
  const n = CLOUD_CREDITS_BY_TIER[key] ?? 0;
  if (key === 'free') return `${n} (trial)`;
  return n.toLocaleString();
}

function formatSeats(tierKey: string | null): string {
  const key = tierKey || 'free';
  const n = TEAM_SEATS_BY_TIER[key] ?? 0;
  if (n <= 0) return '—';
  if (n >= 999999) return 'Unlimited';
  return String(n);
}

function formatZip(tierKey: string | null): string {
  if (isSandboxTier(tierKey)) return 'Locked';
  return canExportCleanZip(tierKey, ACTIVE) ? 'Clean ZIP' : '—';
}

function formatSupport(tierKey: string | null): string {
  if (canUseSupportTickets(tierKey, ACTIVE)) {
    if (tierKey === 'team_enterprise') return 'SLA + Slack + tickets';
    if (tierKey === 'sovereign') return 'Custom SLA + tickets';
    return 'Ticket portal';
  }
  return 'Contact form';
}

function gate(
  tierKey: string | null,
  fn: (tier: string | null | undefined, status: string | null | undefined) => boolean
): boolean {
  if (isSandboxTier(tierKey)) return fn(tierKey, null);
  return fn(tierKey, ACTIVE);
}

/** All tiers from PRICING_TIERS — single source of truth for columns. */
export function getCompareTiers(): PricingTier[] {
  return PRICING_TIERS;
}

/**
 * Comparison rows derived from tier-config / project-limits / support-access
 * (enforced behavior), plus Marketplace via hasPaidTier path gating.
 */
export function buildCompareRows(tiers: PricingTier[] = PRICING_TIERS): CompareRow[] {
  const keys = tiers.map((t) => t.tier);

  const boolRow = (
    label: string,
    fn: (tier: string | null | undefined, status: string | null | undefined) => boolean
  ): CompareRow => ({
    label,
    values: keys.map((k) => gate(k, fn)),
  });

  return [
    {
      label: 'Cloud AI credits / period',
      values: keys.map((k) => formatCredits(k)),
    },
    {
      label: 'Projects',
      values: keys.map((k) => formatProjects(k)),
    },
    {
      label: 'Concurrent sessions',
      values: keys.map((k) => formatSessions(k)),
    },
    {
      label: 'Builder access',
      values: keys.map((k) => (isSandboxTier(k) ? 'After phone verify' : 'Full')),
    },
    {
      label: 'ZIP export',
      values: keys.map((k) => formatZip(k)),
    },
    boolRow('PWA mobile export', canExportPwa),
    {
      label: 'Marketplace access',
      values: keys.map((k) => hasPaidTier(k)),
    },
    boolRow('Live preview deploy', isPaidAndActive),
    {
      label: 'BYOC (own API keys)',
      values: keys.map((k) => canUseOwnApiKeys(k)),
    },
    {
      label: 'Local Ollama engine',
      values: keys.map((k) => canUseLocalOllama(k)),
    },
    boolRow('Google Places import', canImportGooglePlaces),
    boolRow('Phaser.js game templates', canUseGameTemplates),
    boolRow('App Store / mobile export pipeline', canExportMobileProject),
    boolRow('Native Capacitor export', canExportNative),
    {
      label: 'Team seats',
      values: keys.map((k) => formatSeats(k)),
    },
    boolRow('Competitor intel', canUseCompetitorIntel),
    boolRow('Schedule social posts', (t, s) => canScheduleSocialPosts(t, s, false)),
    boolRow('Custom domains', canUseCustomDomains),
    boolRow('White-label rebrand', canUseWhiteLabelBranding),
    {
      label: 'Support',
      values: keys.map((k) => formatSupport(k)),
    },
  ];
}

import { EXTRA_SEAT_PRICING_NOTE } from '@/lib/extra-seats';
import { PRICING_TIERS, type PricingTier } from '@/lib/pricing-tiers';
import { hasPaidTier } from '@/lib/access';
import { canUseSupportTickets } from '@/lib/support-access';
import {
  CLOUD_CREDITS_BY_TIER,
  SESSION_LIMITS,
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
  canUseOrgSso,
  canUseWhiteLabelBranding,
  getTeamSeats,
  isPaidAndActive,
  isSandboxTier,
  isTeamEnterpriseOrAbove,
} from '@/lib/tier-config';
import { getProjectLimit, isUnlimitedTier } from '@/lib/project-limits';

/** Active subscription assumed for paid-tier gating in the comparison matrix. */
const ACTIVE = 'active';

/** Cell label for capabilities sold on the roadmap but not yet functionally shipped. */
export const COMING_SOON_LABEL = 'Coming soon';

export type CompareCell = string | boolean;

export type CompareRow = {
  label: string;
  /** Values aligned with PRICING_TIERS column order */
  values: CompareCell[];
  /** Optional footnote under the feature label (e.g. extra-seat pricing). */
  note?: string;
};

/**
 * Short column taglines for the comparison page.
 * Honest about what ships today vs enterprise roadmap items.
 */
export const TIER_COMPARE_TAGLINES: Record<string, string> = {
  Sandbox: 'Try it free — no card, just a quick phone verification.',
  Basic: 'Solo freelancers who need clean exports and PWA',
  'Pro Worker': 'Power users — BYOC, Places AI, games, and 4× credits',
  'Agency Studio': 'Studios shipping client work with native export and ticket support',
  'Scale Team': 'Growing teams that need volume, credits, and seats',
  'White-Label': 'Resellers — custom domains, white-label rebrand, and high credits',
  'Team Enterprise': 'Mid-size companies — high credits, seats, and white-label',
  Sovereign: 'Maximum credits today — dedicated infra and custom SLA on the roadmap',
};

/** Note shown above the comparison matrix. */
export const COMPARE_ROADMAP_NOTE =
  "Enterprise features marked Coming soon are in active development — contact us for current availability and roadmap.";

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

function formatTeamSeats(tierKey: string | null): CompareCell {
  const n = getTeamSeats(tierKey);
  if (n <= 0) return false;
  if (n >= 999999) return 'Unlimited';
  return String(n);
}

function formatZip(tierKey: string | null): string {
  if (isSandboxTier(tierKey)) return 'Locked';
  return canExportCleanZip(tierKey, ACTIVE) ? 'Clean ZIP' : '—';
}

/** Support that is actually enforced: ticket portal (Pro+) or contact form. */
function formatSupport(tierKey: string | null): string {
  if (canUseSupportTickets(tierKey, ACTIVE)) return 'Ticket portal';
  return 'Contact form';
}

function gate(
  tierKey: string | null,
  fn: (tier: string | null | undefined, status: string | null | undefined) => boolean
): boolean {
  if (isSandboxTier(tierKey)) return fn(tierKey, null);
  return fn(tierKey, ACTIVE);
}

/** Planned for this tier → Coming soon; otherwise not included. */
function roadmapCell(
  tierKey: string | null,
  planned: (tierKey: string | null) => boolean
): CompareCell {
  return planned(tierKey) ? COMING_SOON_LABEL : false;
}

function isSovereign(tierKey: string | null): boolean {
  return tierKey === 'sovereign';
}

/** All tiers from PRICING_TIERS — single source of truth for columns. */
export function getCompareTiers(): PricingTier[] {
  return PRICING_TIERS;
}

/**
 * Comparison rows: enforced entitlements as ✓ / text; unbuilt enterprise
 * capabilities kept in the matrix as "Coming soon" (not removed).
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
      label: 'Team seats (orgs, invites, roles)',
      values: keys.map((k) => formatTeamSeats(k)),
      note: EXTRA_SEAT_PRICING_NOTE,
    },
    boolRow('Competitor intel', canUseCompetitorIntel),
    {
      label: 'Schedule social posts',
      values: keys.map((k) =>
        roadmapCell(k, (key) => canScheduleSocialPosts(key, ACTIVE, false))
      ),
    },
    {
      label: 'Custom domains (self-serve)',
      values: keys.map((k) => gate(k, canUseCustomDomains)),
    },
    {
      label: 'White-label rebrand',
      values: keys.map((k) => gate(k, canUseWhiteLabelBranding)),
    },
    {
      label: 'SSO (SAML)',
      values: keys.map((k) => gate(k, canUseOrgSso)),
    },
    {
      label: 'SLA contracts',
      values: keys.map((k) =>
        roadmapCell(k, (key) => isTeamEnterpriseOrAbove(key, ACTIVE))
      ),
    },
    {
      label: 'Dedicated infrastructure',
      values: keys.map((k) => roadmapCell(k, isSovereign)),
    },
    {
      label: 'Support',
      values: keys.map((k) => formatSupport(k)),
    },
  ];
}

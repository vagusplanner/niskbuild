import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isPaidAndActive, TEAM_SEATS_BY_TIER } from '@/lib/tier-config';
import { tierAtLeast, tierIndex, type TierSlug } from '@/lib/tier-rank';

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export type OrganizationRow = {
  id: string;
  name: string;
  billing_owner_id: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMemberRow = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  joined_at: string;
};

/**
 * Where tier inheritance applies.
 *
 * - `personal` — use the user's own profile tier/status only. Correct for global
 *   gates (nav, pricing upsells, account billing UI, anything not tied to an org
 *   project). A Pro user who is a member of an Agency org must NOT get Agency
 *   features in this mode.
 *
 * - `org` — max(personal, billing owner's tier for the given org). Only use when
 *   the request is org-aware (e.g. editing a project with org_id set, team
 *   settings, shared credit debit against the billing owner in Phase 3).
 *   Requires `orgId`. Phase 2 must pass project.org_id / active org id here.
 */
export type EffectiveTierContext = 'personal' | 'org';

export type EffectiveTier = {
  tier: string;
  status: string;
  /** Which source won (or personal if tied / org not higher). */
  source: 'personal' | 'org';
  /** Billing owner of the org when source is org or when org context was used. */
  billingOwnerId: string | null;
  orgId: string | null;
};

const AGENCY_PLUS_TIERS = [
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export function isAgencyPlusTier(tier: string | null | undefined): boolean {
  return AGENCY_PLUS_TIERS.includes(tier as (typeof AGENCY_PLUS_TIERS)[number]);
}

/** Seat cap for an org — Owner counts toward the limit (Agency = 3 including owner). */
export function getOrgSeatLimitForOwnerTier(tier: string | null | undefined): number {
  return TEAM_SEATS_BY_TIER[tier || 'free'] ?? 0;
}

function higherTier(
  a: { tier: string; status: string },
  b: { tier: string; status: string }
): { tier: string; status: string; winner: 'a' | 'b' } {
  const aActive = isPaidAndActive(a.tier, a.status);
  const bActive = isPaidAndActive(b.tier, b.status);
  if (aActive && !bActive) return { ...a, winner: 'a' };
  if (bActive && !aActive) return { ...b, winner: 'b' };
  if (tierIndex(b.tier) > tierIndex(a.tier)) return { ...b, winner: 'b' };
  return { ...a, winner: 'a' };
}

/**
 * Resolve entitlements for a user.
 *
 * PHASE 2 WIRING: Do not replace every `profile.subscription_tier` read with
 * `context: 'org'` globally — that would leak Agency+ features to members
 * outside org context. Prefer:
 *   - personal profile tier for account-level UI / non-org projects
 *   - resolveEffectiveTier({ context: 'org', orgId }) when acting on org resources
 *
 * Credits (confirmed): shared pool lives on the billing owner's profile;
 * Phase 3 debit paths should use billingOwnerId from an org-context resolve.
 */
export async function resolveEffectiveTier(params: {
  userId: string;
  context: EffectiveTierContext;
  orgId?: string | null;
}): Promise<EffectiveTier> {
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, subscription_tier, subscription_status')
    .eq('id', params.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const personal = {
    tier: (profile?.subscription_tier as string) || 'free',
    status: (profile?.subscription_status as string) || 'inactive',
  };

  if (params.context === 'personal') {
    return {
      tier: personal.tier,
      status: personal.status,
      source: 'personal',
      billingOwnerId: null,
      orgId: null,
    };
  }

  // context === 'org'
  const orgId = params.orgId ?? null;
  if (!orgId) {
    // Fail closed to personal — callers must pass orgId for inheritance.
    return {
      tier: personal.tier,
      status: personal.status,
      source: 'personal',
      billingOwnerId: null,
      orgId: null,
    };
  }

  const { data: membership, error: memErr } = await admin
    .from('organization_members')
    .select('org_id, role')
    .eq('org_id', orgId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (memErr) throw new Error(memErr.message);
  if (!membership) {
    return {
      tier: personal.tier,
      status: personal.status,
      source: 'personal',
      billingOwnerId: null,
      orgId,
    };
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, billing_owner_id')
    .eq('id', orgId)
    .maybeSingle();

  if (orgErr) throw new Error(orgErr.message);
  if (!org?.billing_owner_id) {
    return {
      tier: personal.tier,
      status: personal.status,
      source: 'personal',
      billingOwnerId: null,
      orgId,
    };
  }

  const { data: ownerProfile, error: ownerErr } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', org.billing_owner_id)
    .maybeSingle();

  if (ownerErr) throw new Error(ownerErr.message);

  const orgTiers = {
    tier: (ownerProfile?.subscription_tier as string) || 'free',
    status: (ownerProfile?.subscription_status as string) || 'inactive',
  };

  const picked = higherTier(personal, orgTiers);
  return {
    tier: picked.tier,
    status: picked.status,
    source: picked.winner === 'b' ? 'org' : 'personal',
    billingOwnerId: org.billing_owner_id as string,
    orgId,
  };
}

/** List orgs the user belongs to (Phase 2 team UI / project scoping). */
export async function listOrganizationsForUser(
  userId: string
): Promise<(OrganizationRow & { role: OrgMemberRole })[]> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from('organization_members')
    .select('role, org_id, organizations ( id, name, billing_owner_id, created_at, updated_at )')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  return (memberships ?? [])
    .map((row) => {
      const org = row.organizations as unknown as OrganizationRow | OrganizationRow[] | null;
      const resolved = Array.isArray(org) ? org[0] : org;
      if (!resolved) return null;
      return { ...resolved, role: row.role as OrgMemberRole };
    })
    .filter(Boolean) as (OrganizationRow & { role: OrgMemberRole })[];
}

export function orgContextRequiresAgencyPlus(tier: string | null | undefined): boolean {
  return tierAtLeast(tier, 'agency' as TierSlug);
}

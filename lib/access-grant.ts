import 'server-only';

import { PAID_TIERS } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCloudCreditsForTier } from '@/lib/tier-config';
import { reactivatePreviewsIfPaidAndActive } from '@/lib/preview-links';

/** Schema mirror for profiles.access_grant */
export const ACCESS_GRANT_KINDS = ['none', 'admin_comped'] as const;
export type AccessGrantKind = (typeof ACCESS_GRANT_KINDS)[number];

export const ACCESS_GRANT_TIERS = [...PAID_TIERS] as const;
export type AccessGrantTier = (typeof ACCESS_GRANT_TIERS)[number];

/** Profile columns for admin-comped grants (mirrors migration). */
export type AccessGrantProfileFields = {
  access_grant: AccessGrantKind;
  access_grant_tier: string | null;
  access_grant_notes: string | null;
  access_grant_granted_by: string | null;
  access_grant_expires_at: string | null;
};

export type ActiveAdminCompedGrant = {
  tier: AccessGrantTier;
  notes: string | null;
  grantedBy: string | null;
  expiresAt: string | null;
};

const GRANT_SELECT =
  'access_grant, access_grant_tier, access_grant_notes, access_grant_granted_by, access_grant_expires_at, subscription_id, subscription_tier, subscription_status';

export function isAccessGrantKind(value: unknown): value is AccessGrantKind {
  return value === 'none' || value === 'admin_comped';
}

export function isAccessGrantTier(value: unknown): value is AccessGrantTier {
  return (
    typeof value === 'string' &&
    (ACCESS_GRANT_TIERS as readonly string[]).includes(value)
  );
}

export function isAdminCompedGrantActive(fields: {
  access_grant?: string | null;
  access_grant_tier?: string | null;
  access_grant_expires_at?: string | null;
}): boolean {
  if (fields.access_grant !== 'admin_comped') return false;
  if (!isAccessGrantTier(fields.access_grant_tier)) return false;
  const expiresAt = fields.access_grant_expires_at;
  if (expiresAt) {
    const ts = Date.parse(expiresAt);
    if (Number.isFinite(ts) && ts <= Date.now()) return false;
  }
  return true;
}

export async function loadActiveAdminCompedGrant(
  userId: string
): Promise<ActiveAdminCompedGrant | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select(
      'access_grant, access_grant_tier, access_grant_notes, access_grant_granted_by, access_grant_expires_at'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('loadActiveAdminCompedGrant failed:', error.message);
    return null;
  }
  if (!data || !isAdminCompedGrantActive(data)) return null;
  if (!isAccessGrantTier(data.access_grant_tier)) return null;

  return {
    tier: data.access_grant_tier,
    notes: data.access_grant_notes ?? null,
    grantedBy: data.access_grant_granted_by ?? null,
    expiresAt: data.access_grant_expires_at ?? null,
  };
}

/**
 * True when the user should not start a paid checkout / receive dunning mail
 * (platform owner OR active admin_comped). Prefer after auth with userId.
 */
export async function hasComplimentaryProductAccess(userId: string): Promise<boolean> {
  const { isPlatformOwner } = await import('@/lib/platform-owner-auth');
  if (await isPlatformOwner(userId)) return true;
  return Boolean(await loadActiveAdminCompedGrant(userId));
}

export type GrantCompedAccessInput = {
  userId: string;
  tier: AccessGrantTier;
  grantedBy: string;
  notes?: string | null;
  expiresAt?: string | null;
};

export type GrantCompedAccessResult =
  | {
      ok: true;
      tier: AccessGrantTier;
      access_grant: 'admin_comped';
      expiresAt: string | null;
    }
  | { ok: false; error: string; status?: number };

/** DB-only grant. Refuses when a Stripe subscription_id is still on the profile. */
export async function grantAdminCompedAccess(
  input: GrantCompedAccessInput
): Promise<GrantCompedAccessResult> {
  const admin = createAdminClient();
  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select(GRANT_SELECT)
    .eq('id', input.userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message, status: 500 };
  }
  if (!profile) {
    return { ok: false, error: 'User not found', status: 404 };
  }

  const subscriptionId =
    typeof profile.subscription_id === 'string' && profile.subscription_id.trim()
      ? profile.subscription_id.trim()
      : null;
  if (subscriptionId) {
    return {
      ok: false,
      error:
        'User still has a Stripe subscription_id. Cancel/void that subscription and clear subscription_id before granting comped access.',
      status: 409,
    };
  }

  const expiresAt =
    typeof input.expiresAt === 'string' && input.expiresAt.trim()
      ? input.expiresAt.trim()
      : null;
  if (expiresAt) {
    const ts = Date.parse(expiresAt);
    if (!Number.isFinite(ts)) {
      return { ok: false, error: 'Invalid expiresAt', status: 400 };
    }
    if (ts <= Date.now()) {
      return { ok: false, error: 'expiresAt must be in the future', status: 400 };
    }
  }

  const notes =
    typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim() : null;

  const row = {
    access_grant: 'admin_comped' as const,
    access_grant_tier: input.tier,
    access_grant_notes: notes,
    access_grant_granted_by: input.grantedBy,
    access_grant_expires_at: expiresAt,
    subscription_tier: input.tier,
    subscription_status: 'active',
    cloud_credits_remaining: getCloudCreditsForTier(input.tier),
    credit_alert_80_sent: false,
    credit_alert_100_sent: false,
  };

  const { error: updateError } = await admin
    .from('profiles')
    .update(row)
    .eq('id', input.userId);

  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }

  await reactivatePreviewsIfPaidAndActive(input.userId, input.tier, 'active');

  return {
    ok: true,
    tier: input.tier,
    access_grant: 'admin_comped',
    expiresAt,
  };
}

export type RevokeCompedAccessResult =
  | { ok: true }
  | { ok: false; error: string; status?: number };

/** Clears admin_comped grant and reverts profile to free (DB-only, no Stripe). */
export async function revokeAdminCompedAccess(
  userId: string
): Promise<RevokeCompedAccessResult> {
  const admin = createAdminClient();
  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('id, access_grant, subscription_id')
    .eq('id', userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message, status: 500 };
  }
  if (!profile) {
    return { ok: false, error: 'User not found', status: 404 };
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({
      access_grant: 'none',
      access_grant_tier: null,
      access_grant_notes: null,
      access_grant_granted_by: null,
      access_grant_expires_at: null,
      subscription_tier: 'free',
      subscription_status: 'active',
      cloud_credits_remaining: getCloudCreditsForTier('free'),
    })
    .eq('id', userId);

  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }

  return { ok: true };
}

import 'server-only';

import { resolveProductGatingBypass } from '@/lib/platform-owner-bypass';

/**
 * SuperEduc8 plan access — server-authoritative.
 *
 * Platform-owner bypass reuses the same `firstparty.platform_owners` /
 * `is_platform_owner` verification as Vagus Planner and NiskBuild (via
 * {@link resolveProductGatingBypass}). Not client-spoofable.
 *
 * Stripe products for SuperEduc8 are not wired yet; until then non-owners are
 * treated as free-tier. When paywalls land, call {@link hasShiftPremiumAccess}
 * (or this resolver) on mutate paths the same way VP uses plan-access.
 */

export type ShiftPlanId = 'free' | 'trial' | 'student' | 'family' | 'full';

export type ShiftPlanAccess = {
  plan: ShiftPlanId;
  status: 'none' | 'trialing' | 'active';
  isPaid: boolean;
  /** True only when server verified the user is in firstparty.platform_owners */
  platformOwnerBypass: boolean;
  hasFullAccess: boolean;
};

export const PLATFORM_OWNER_SHIFT_PLAN_ACCESS: ShiftPlanAccess = {
  plan: 'full',
  status: 'active',
  isPaid: true,
  platformOwnerBypass: true,
  hasFullAccess: true,
};

export const FREE_SHIFT_PLAN_ACCESS: ShiftPlanAccess = {
  plan: 'free',
  status: 'none',
  isPaid: false,
  platformOwnerBypass: false,
  hasFullAccess: false,
};

/** Resolve SuperEduc8 entitlement for a verified auth user id. */
export async function resolveShiftPlanAccess(userId: string): Promise<ShiftPlanAccess> {
  if (await resolveProductGatingBypass(userId)) {
    return PLATFORM_OWNER_SHIFT_PLAN_ACCESS;
  }
  // Placeholder until SuperEduc8 Stripe subscriptions exist.
  return FREE_SHIFT_PLAN_ACCESS;
}

/** Convenience gate for future premium feature checks. */
export async function hasShiftPremiumAccess(userId: string): Promise<boolean> {
  const access = await resolveShiftPlanAccess(userId);
  return access.hasFullAccess;
}

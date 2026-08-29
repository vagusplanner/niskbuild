/**
 * Shared helpers for Vagus Planner Islamic Edition entitlement.
 * Paid access must come from a real subscription record — never localStorage / edition prefs alone.
 */

import {
  isProductGatingBypassActive,
  PLATFORM_OWNER_ISLAMIC_ACCESS,
} from '@/lib/platform-owner-bypass';

export const PAID_ISLAMIC_PLANS = [
  'basic_islamic',
  'pro_islamic',
  'enterprise_islamic',
  'basic islamic',
  'pro islamic',
  'enterprise islamic',
] as const;

export const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due']);

export function normalizePlanId(plan: unknown): string {
  if (typeof plan !== 'string') return '';
  return plan.toLowerCase().trim().replace(/\s+/g, '_');
}

/** True for paid Islamic plan slugs (not free / standard plans). */
export function isPaidIslamicPlan(plan: unknown): boolean {
  const p = normalizePlanId(plan);
  if (!p || p === 'free') return false;
  return (
    p === 'basic_islamic' ||
    p === 'pro_islamic' ||
    p === 'enterprise_islamic' ||
    (p.includes('islamic') && !p.startsWith('free'))
  );
}

export function isEntitledSubscriptionStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false;
  return ACTIVE_SUB_STATUSES.has(status.toLowerCase().trim());
}

export type IslamicAccessInput = {
  /** Rows from firstparty.vp_subscriptions (newest first preferred). */
  subscriptions?: Array<{ plan?: unknown; status?: unknown }> | null;
  /** NiskBuild profiles row — Stripe webhooks may land tier here. */
  profile?: {
    subscription_tier?: unknown;
    subscription_status?: unknown;
  } | null;
};

export type IslamicAccessResult = {
  hasPaidIslamicAccess: boolean;
  plan: string | null;
  status: string | null;
  source: 'vp_subscriptions' | 'profiles' | null;
};

/**
 * Resolve whether the user has a paid Islamic Edition entitlement.
 * Prefers vp_subscriptions; falls back to profiles.subscription_tier for Stripe
 * checkouts that update the NiskBuild profile instead of vp_subscriptions.
 */
export function resolvePaidIslamicAccess(input: IslamicAccessInput): IslamicAccessResult {
  if (isProductGatingBypassActive()) {
    return PLATFORM_OWNER_ISLAMIC_ACCESS;
  }

  const subs = input.subscriptions ?? [];
  for (const sub of subs) {
    const plan = normalizePlanId(sub.plan);
    const status = typeof sub.status === 'string' ? sub.status.toLowerCase().trim() : '';
    if (isPaidIslamicPlan(plan) && isEntitledSubscriptionStatus(status)) {
      return {
        hasPaidIslamicAccess: true,
        plan,
        status,
        source: 'vp_subscriptions',
      };
    }
  }

  const tier = normalizePlanId(input.profile?.subscription_tier);
  const profileStatus =
    typeof input.profile?.subscription_status === 'string'
      ? input.profile.subscription_status.toLowerCase().trim()
      : '';
  // Require an explicit entitled status — a forged/empty status must not unlock access.
  if (isPaidIslamicPlan(tier) && profileStatus && isEntitledSubscriptionStatus(profileStatus)) {
    return {
      hasPaidIslamicAccess: true,
      plan: tier,
      status: profileStatus,
      source: 'profiles',
    };
  }

  return {
    hasPaidIslamicAccess: false,
    plan: null,
    status: null,
    source: null,
  };
}

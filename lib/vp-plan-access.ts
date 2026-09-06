/**
 * Server-side Vagus Planner plan resolution.
 * Prefer firstparty.vp_subscriptions; fall back to profiles (Stripe webhook).
 */

import {
  isEntitledSubscriptionStatus,
  isPaidIslamicPlan,
  normalizePlanId,
  resolvePaidIslamicAccess,
  type IslamicAccessInput,
} from '@/lib/vp-islamic-access';
import {
  isProductGatingBypassActive,
  PLATFORM_OWNER_VP_PLAN_INFO,
  resolveProductGatingBypass,
} from '@/lib/platform-owner-bypass';

export type PlanAccessInput = IslamicAccessInput;

export type EffectivePlanResult = {
  plan: string;
  status: string | null;
  source: 'vp_subscriptions' | 'profiles' | null;
  hasPaidIslamicAccess: boolean;
  /** Any non-free entitled plan (standard or islamic). */
  isPaid: boolean;
};

/**
 * Sync plan resolution — trusts ALS only.
 * Prefer {@link resolveEffectivePlanForUser} on async request paths.
 */
export function resolveEffectivePlan(input: PlanAccessInput): EffectivePlanResult {
  if (isProductGatingBypassActive()) {
    return PLATFORM_OWNER_VP_PLAN_INFO;
  }

  const islamic = resolvePaidIslamicAccess(input);

  const subs = input.subscriptions ?? [];
  for (const sub of subs) {
    const plan = normalizePlanId(sub.plan) || 'free';
    const status = typeof sub.status === 'string' ? sub.status.toLowerCase().trim() : '';
    if (plan && plan !== 'free' && isEntitledSubscriptionStatus(status)) {
      return {
        plan,
        status,
        source: 'vp_subscriptions',
        hasPaidIslamicAccess: isPaidIslamicPlan(plan),
        isPaid: true,
      };
    }
  }

  const tier = normalizePlanId(input.profile?.subscription_tier) || 'free';
  const profileStatus =
    typeof input.profile?.subscription_status === 'string'
      ? input.profile.subscription_status.toLowerCase().trim()
      : '';
  if (tier && tier !== 'free' && profileStatus && isEntitledSubscriptionStatus(profileStatus)) {
    return {
      plan: tier,
      status: profileStatus,
      source: 'profiles',
      hasPaidIslamicAccess: isPaidIslamicPlan(tier),
      isPaid: true,
    };
  }

  return {
    plan: 'free',
    status: profileStatus || null,
    source: null,
    hasPaidIslamicAccess: islamic.hasPaidIslamicAccess,
    isPaid: false,
  };
}

/**
 * Same as {@link resolveEffectivePlan}, but re-resolves platform-owner bypass
 * by userId when ALS is missing/lost.
 */
export async function resolveEffectivePlanForUser(
  userId: string | undefined,
  input: PlanAccessInput
): Promise<EffectivePlanResult> {
  if (await resolveProductGatingBypass(userId)) {
    return PLATFORM_OWNER_VP_PLAN_INFO;
  }
  return resolveEffectivePlan(input);
}

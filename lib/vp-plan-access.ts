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

export type PlanAccessInput = IslamicAccessInput;

export type EffectivePlanResult = {
  plan: string;
  status: string | null;
  source: 'vp_subscriptions' | 'profiles' | null;
  hasPaidIslamicAccess: boolean;
  /** Any non-free entitled plan (standard or islamic). */
  isPaid: boolean;
};

export function resolveEffectivePlan(input: PlanAccessInput): EffectivePlanResult {
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

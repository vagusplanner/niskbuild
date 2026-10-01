/**
 * Dual-purchase guards: Apple IAP vs Stripe must not stack at equal/higher rank.
 * Keep SE8 / NiskBuild billing isolated — VP-only.
 */

import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';
import { isEntitledSubscriptionStatus, normalizePlanId } from '@/lib/vp-islamic-access';
import { isEqualOrHigherPlan } from '@/lib/vp-plan-rank';

type AdminClient = ReturnType<typeof createAdminClient>;

export const WEB_SUB_MANAGE_MESSAGE =
  "You're subscribed on web, manage there";

export const APPLE_SUB_MANAGE_MESSAGE =
  "You're subscribed through Apple, manage there";

export type ActiveVpSub = {
  plan: string;
  status: string;
  provider: string | null;
  stripe_subscription_id?: string | null;
  original_transaction_id?: string | null;
};

async function loadActiveVpSubs(
  admin: AdminClient,
  userId: string
): Promise<ActiveVpSub[]> {
  const { data } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .select('plan, status, provider, stripe_subscription_id, original_transaction_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return (data || [])
    .map((row) => ({
      plan: normalizePlanId(row.plan) || 'free',
      status: typeof row.status === 'string' ? row.status.toLowerCase().trim() : '',
      provider: typeof row.provider === 'string' ? row.provider.toLowerCase().trim() : null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      original_transaction_id: row.original_transaction_id ?? null,
    }))
    .filter((row) => row.plan !== 'free' && isEntitledSubscriptionStatus(row.status));
}

function providerOf(row: ActiveVpSub): 'apple' | 'stripe' | 'unknown' {
  if (row.provider === 'apple') return 'apple';
  if (row.provider === 'stripe') return 'stripe';
  if (row.original_transaction_id) return 'apple';
  if (row.stripe_subscription_id) return 'stripe';
  return 'unknown';
}

/**
 * Before Apple IAP: block if an active Stripe (or web) sub is equal/higher rank.
 */
export async function blockApplePurchaseIfStripeActive(
  admin: AdminClient,
  userId: string,
  requestedPlan: string
): Promise<{ blocked: true; message: string; existingPlan: string } | { blocked: false }> {
  const active = await loadActiveVpSubs(admin, userId);
  const stripeOrWeb = active.filter((s) => {
    const p = providerOf(s);
    return p === 'stripe' || p === 'unknown';
  });
  for (const sub of stripeOrWeb) {
    if (isEqualOrHigherPlan(sub.plan, requestedPlan)) {
      return {
        blocked: true,
        message: WEB_SUB_MANAGE_MESSAGE,
        existingPlan: sub.plan,
      };
    }
  }
  return { blocked: false };
}

/**
 * Before web Stripe checkout: block if an active Apple (provider=apple) subscription exists
 * at equal/higher plan rank than the requested plan.
 */
export async function blockStripeCheckoutIfAppleActive(
  admin: AdminClient,
  userId: string,
  requestedPlan?: string | null
): Promise<{ blocked: true; message: string; existingPlan: string } | { blocked: false }> {
  const active = await loadActiveVpSubs(admin, userId);
  const apple = active.filter((s) => providerOf(s) === 'apple');
  const requested = normalizePlanId(requestedPlan) || 'basic';
  for (const sub of apple) {
    if (isEqualOrHigherPlan(sub.plan, requested)) {
      return {
        blocked: true,
        message: APPLE_SUB_MANAGE_MESSAGE,
        existingPlan: sub.plan,
      };
    }
  }
  return { blocked: false };
}

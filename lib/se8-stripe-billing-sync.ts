/**
 * Sync Stripe subscription events into firstparty.se8_subscriptions.
 * Never mutates profiles.subscription_tier (shared Stripe account).
 */

import 'server-only';

import type Stripe from 'stripe';
import type { createAdminClient } from '@/lib/supabase/admin';
import { isSuperEduc8StripeSubscription } from '@/lib/stripe-subscription-product';
import {
  isSe8StripePriceId,
  SE8_STRIPE_PRICE_IDS,
  type Se8BillingInterval,
  type Se8PlanId,
} from '@/lib/se8-stripe-price-ids';

type AdminClient = ReturnType<typeof createAdminClient>;

export const SE8_PAST_DUE_GRACE_DAYS = 7;

const SE8_SUB_STATUSES = new Set([
  'none',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'paused',
]);

export { isSuperEduc8StripeSubscription };

export function isSuperEduc8CheckoutSession(session: Stripe.Checkout.Session): boolean {
  const source =
    typeof session.metadata?.source === 'string'
      ? session.metadata.source.trim().toLowerCase()
      : '';
  return source === 'supereduc8';
}

function unixToIso(ts: number | null | undefined): string | null {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts * 1000).toISOString();
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const raw = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & { current_period_end?: number })
    | undefined;
  return unixToIso(raw.current_period_end ?? item?.current_period_end ?? null);
}

function billingIntervalFromSubscription(
  subscription: Stripe.Subscription
): Se8BillingInterval | null {
  for (const item of subscription.items?.data ?? []) {
    const price = item.price;
    if (price && typeof price === 'object' && price.recurring?.interval === 'year') {
      return 'year';
    }
    if (price && typeof price === 'object' && price.recurring?.interval === 'month') {
      return 'month';
    }
  }
  const meta =
    typeof subscription.metadata?.interval === 'string'
      ? subscription.metadata.interval.trim().toLowerCase()
      : '';
  if (meta === 'year' || meta === 'yearly' || meta === 'annual') return 'year';
  if (meta === 'month' || meta === 'monthly') return 'month';
  return null;
}

function childQuantityFromSubscription(subscription: Stripe.Subscription): number {
  const metaQty = Number(subscription.metadata?.childQuantity ?? subscription.metadata?.child_quantity);
  if (Number.isFinite(metaQty) && metaQty >= 0) return Math.floor(metaQty);

  let childQty = 0;
  for (const item of subscription.items?.data ?? []) {
    const price = item.price;
    const priceId = typeof price === 'string' ? price : price?.id;
    if (!priceId || !isSe8StripePriceId(priceId)) continue;
    // Student prices are the base line; everything else SE8 is additional-child.
    const isStudent =
      priceId === SE8_STRIPE_PRICE_IDS.studentMonthly ||
      priceId === SE8_STRIPE_PRICE_IDS.studentAnnual;
    if (!isStudent) {
      childQty += item.quantity ?? 0;
    }
  }
  return childQty;
}

function planFromSubscription(subscription: Stripe.Subscription): Se8PlanId {
  const metaPlan =
    typeof subscription.metadata?.plan === 'string'
      ? subscription.metadata.plan.trim().toLowerCase()
      : '';
  if (metaPlan === 'family') return 'family';
  if (metaPlan === 'student') return 'student';
  return childQuantityFromSubscription(subscription) > 0 ? 'family' : 'student';
}

function multiCurriculumFromSubscription(subscription: Stripe.Subscription): boolean {
  const raw = subscription.metadata?.multiCurriculum ?? subscription.metadata?.multi_curriculum;
  if (raw === true || raw === 'true' || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === '0') return false;
  return false;
}

function mapStripeStatus(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'unpaid' || s === 'incomplete_expired') return 'canceled';
  if (SE8_SUB_STATUSES.has(s)) return s;
  return 'canceled';
}

export function isSe8PastDueWithinGrace(
  status: string,
  currentPeriodEnd: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (status !== 'past_due') return false;
  if (!currentPeriodEnd) return true;
  const end = new Date(currentPeriodEnd).getTime();
  if (!Number.isFinite(end)) return true;
  return nowMs < end + SE8_PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

export function isSe8SubscriptionEntitled(row: {
  status: string | null | undefined;
  current_period_end?: string | null;
}): boolean {
  const status = (row.status || '').toLowerCase().trim();
  if (status === 'active') return true;
  if (status === 'past_due') {
    return isSe8PastDueWithinGrace(status, row.current_period_end);
  }
  return false;
}

export type Se8SubscriptionUpsertInput = {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  plan: string;
  interval?: Se8BillingInterval | null;
  childQuantity?: number;
  multiCurriculum?: boolean;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  /** When true, do not overwrite an existing trial_ends_at with null. */
  preserveTrialEndsAt?: boolean;
};

export async function upsertSe8Subscription(
  admin: AdminClient,
  input: Se8SubscriptionUpsertInput
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .select('id, trial_ends_at')
    .eq('user_id', input.userId)
    .maybeSingle();

  const trialEndsAt =
    input.preserveTrialEndsAt && input.trialEndsAt == null
      ? existing?.trial_ends_at ?? null
      : input.trialEndsAt === undefined
        ? existing?.trial_ends_at ?? null
        : input.trialEndsAt;

  const row = {
    user_id: input.userId,
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    status: mapStripeStatus(input.status),
    plan: input.plan,
    interval: input.interval ?? null,
    child_quantity: input.childQuantity ?? 0,
    multi_curriculum: input.multiCurriculum ?? false,
    trial_ends_at: trialEndsAt,
    current_period_end: input.currentPeriodEnd ?? null,
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await admin
      .schema('firstparty')
      .from('se8_subscriptions')
      .update(row)
      .eq('id', existing.id);
    if (error) {
      console.error('[se8-billing] update failed:', error.message);
      throw new Error(`se8_subscriptions update failed: ${error.message}`);
    }
    return;
  }

  const { error } = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .insert({ ...row, created_at: now });
  if (error) {
    console.error('[se8-billing] insert failed:', error.message);
    throw new Error(`se8_subscriptions insert failed: ${error.message}`);
  }
}

export async function syncSe8BillingFromSubscription(
  admin: AdminClient,
  opts: {
    subscription: Stripe.Subscription;
    userId?: string | null;
    forceCanceled?: boolean;
  }
): Promise<void> {
  const subscription = opts.subscription;
  if (!isSuperEduc8StripeSubscription(subscription) && !opts.forceCanceled) {
    // Still allow forceCanceled when we know it's SE8 from prior row lookup
  }

  let userId =
    opts.userId ||
    (typeof subscription.metadata?.userId === 'string' ? subscription.metadata.userId : null);

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null;

  if (!userId && customerId) {
    const { data: byCustomer } = await admin
      .schema('firstparty')
      .from('se8_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = byCustomer?.user_id ?? null;
  }

  if (!userId && subscription.id) {
    const { data: bySub } = await admin
      .schema('firstparty')
      .from('se8_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    userId = bySub?.user_id ?? null;
  }

  if (!userId) {
    console.error('[se8-billing] sync skipped — no userId for', subscription.id);
    return;
  }

  const status = opts.forceCanceled ? 'canceled' : mapStripeStatus(subscription.status);
  const childQuantity = childQuantityFromSubscription(subscription);
  const plan =
    status === 'canceled' || status === 'none'
      ? 'free'
      : planFromSubscription(subscription);

  await upsertSe8Subscription(admin, {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status,
    plan,
    interval: billingIntervalFromSubscription(subscription),
    childQuantity,
    multiCurriculum: multiCurriculumFromSubscription(subscription),
    currentPeriodEnd: subscriptionPeriodEnd(subscription),
    preserveTrialEndsAt: true,
  });
}

export async function markSe8SubscriptionPastDue(
  admin: AdminClient,
  opts: { subscription: Stripe.Subscription; userId?: string | null }
): Promise<void> {
  await syncSe8BillingFromSubscription(admin, {
    subscription: {
      ...opts.subscription,
      status: 'past_due',
    } as Stripe.Subscription,
    userId: opts.userId,
  });
}

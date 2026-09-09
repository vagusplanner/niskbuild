/**
 * Sync Stripe subscription/invoice events into firstparty.vp_subscriptions
 * and firstparty.vp_invoices so Vagus Planner Billing/Account UI matches
 * the same entitlement reality as plan-access (profiles fallback + VP rows).
 *
 * NiskBuild profiles updates remain the platform source of truth for credits /
 * org gating; this layer mirrors billing state for the VP product UI.
 */

import 'server-only';

import type Stripe from 'stripe';
import type { createAdminClient } from '@/lib/supabase/admin';
import { normalizePlanId } from '@/lib/vp-islamic-access';
import { resolveTierFromSubscription } from '@/lib/stripe-price-ids';

type AdminClient = ReturnType<typeof createAdminClient>;

const VP_SUB_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'paused',
]);

/** Map NiskBuild / Stripe tier slugs onto VP plan ids used by the SPA. */
export function toVpPlanId(tier: unknown): string {
  const p = normalizePlanId(tier);
  if (!p || p === 'free') return 'free';
  if (p === 'team_enterprise') return 'enterprise';
  return p;
}

export function mapStripeSubscriptionStatusToVp(
  status: string | null | undefined,
  opts?: { cancelAtPeriodEnd?: boolean }
): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'unpaid' || s === 'incomplete_expired') return 'canceled';
  if (VP_SUB_STATUSES.has(s)) return s;
  if (opts?.cancelAtPeriodEnd && s === 'active') return 'active';
  return 'canceled';
}

function unixToIso(ts: number | null | undefined): string | null {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) return null;
  return new Date(ts * 1000).toISOString();
}

/** Stripe SDK typings drift across API versions — read period fields defensively. */
function subscriptionPeriodUnix(subscription: Stripe.Subscription): {
  start: number | null;
  end: number | null;
  trialEnd: number | null;
  canceledAt: number | null;
} {
  const raw = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
    trial_end?: number | null;
    canceled_at?: number | null;
  };
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & {
        current_period_start?: number;
        current_period_end?: number;
      })
    | undefined;
  return {
    start: raw.current_period_start ?? item?.current_period_start ?? null,
    end: raw.current_period_end ?? item?.current_period_end ?? null,
    trialEnd: raw.trial_end ?? null,
    canceledAt: raw.canceled_at ?? null,
  };
}

function invoiceStripeSubscriptionId(invoice: Stripe.Invoice): string | null {
  const raw = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
    parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  };
  if (typeof raw.subscription === 'string' && raw.subscription) return raw.subscription;
  if (raw.subscription && typeof raw.subscription === 'object' && typeof raw.subscription.id === 'string') {
    return raw.subscription.id;
  }
  const fromParent = raw.parent?.subscription_details?.subscription;
  return typeof fromParent === 'string' && fromParent ? fromParent : null;
}

function pricePerMonthFromSubscription(subscription: Stripe.Subscription): number | null {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  if (!price || typeof price !== 'object') return null;
  const unit = typeof price.unit_amount === 'number' ? price.unit_amount / 100 : null;
  if (unit == null) return null;
  const interval = price.recurring?.interval;
  if (interval === 'year') return Math.round((unit / 12) * 100) / 100;
  return unit;
}

function billingCycleFromSubscription(subscription: Stripe.Subscription): 'monthly' | 'yearly' {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  if (price && typeof price === 'object' && price.recurring?.interval === 'year') {
    return 'yearly';
  }
  return 'monthly';
}

function resolvePlanFromSubscription(
  subscription: Stripe.Subscription,
  fallbackTier?: string | null
): string {
  const metaTier =
    typeof subscription.metadata?.tier === 'string' ? subscription.metadata.tier.trim() : '';
  if (metaTier) return toVpPlanId(metaTier);
  if (fallbackTier) return toVpPlanId(fallbackTier);
  return toVpPlanId(resolveTierFromSubscription(subscription));
}

function defaultPaymentMethodId(subscription: Stripe.Subscription): string | null {
  const pm = subscription.default_payment_method;
  if (typeof pm === 'string' && pm) return pm;
  if (pm && typeof pm === 'object' && 'id' in pm && typeof pm.id === 'string') return pm.id;
  return null;
}

export async function resolveVpBillingUser(
  admin: AdminClient,
  opts: {
    userId?: string | null;
    email?: string | null;
    customerId?: string | null;
  }
): Promise<{ userId: string; email: string } | null> {
  if (opts.userId) {
    const { data } = await admin
      .from('profiles')
      .select('id, email')
      .eq('id', opts.userId)
      .maybeSingle();
    if (data?.id) {
      return {
        userId: data.id,
        email: (typeof data.email === 'string' && data.email) || opts.email || '',
      };
    }
  }

  if (opts.email) {
    const { data } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', opts.email)
      .maybeSingle();
    if (data?.id) {
      return {
        userId: data.id,
        email: (typeof data.email === 'string' && data.email) || opts.email,
      };
    }
  }

  if (opts.customerId) {
    const { data } = await admin
      .from('profiles')
      .select('id, email')
      .eq('stripe_customer_id', opts.customerId)
      .maybeSingle();
    if (data?.id) {
      return {
        userId: data.id,
        email: (typeof data.email === 'string' && data.email) || opts.email || '',
      };
    }
  }

  return null;
}

export type UpsertVpSubscriptionInput = {
  subscription: Stripe.Subscription;
  userId: string;
  email: string;
  /** Prefer when subscription.metadata.tier is missing (e.g. checkout.session.completed). */
  fallbackTier?: string | null;
  /** Force canceled/ended display after delete webhook. */
  forceCanceled?: boolean;
};

export async function upsertVpSubscriptionFromStripe(
  admin: AdminClient,
  input: UpsertVpSubscriptionInput
): Promise<{ id: string } | null> {
  const { subscription, userId, email, fallbackTier, forceCanceled } = input;
  const now = new Date().toISOString();
  const plan = forceCanceled ? 'free' : resolvePlanFromSubscription(subscription, fallbackTier);
  const status = forceCanceled
    ? 'canceled'
    : mapStripeSubscriptionStatusToVp(subscription.status, {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

  const period = subscriptionPeriodUnix(subscription);
  const row = {
    user_id: userId,
    user_email: email || '',
    plan: forceCanceled ? 'free' : plan || 'free',
    status,
    price_per_month: pricePerMonthFromSubscription(subscription),
    billing_cycle: billingCycleFromSubscription(subscription),
    current_period_start: unixToIso(period.start),
    current_period_end: unixToIso(period.end),
    trial_end: unixToIso(period.trialEnd),
    canceled_at:
      forceCanceled || subscription.cancel_at_period_end || status === 'canceled'
        ? unixToIso(period.canceledAt) || now
        : null,
    auto_renew: forceCanceled ? false : !subscription.cancel_at_period_end,
    payment_method_id: defaultPaymentMethodId(subscription),
    payment_retry_count: 0,
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null,
    updated_at: now,
  };

  const { data: existing } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await admin
      .schema('firstparty')
      .from('vp_subscriptions')
      .update(row)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) {
      console.error('[vp-stripe-billing-sync] update vp_subscriptions failed:', error.message);
      throw new Error(`vp_subscriptions update failed: ${error.message}`);
    }
    return data;
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .insert({ ...row, created_at: now })
    .select('id')
    .single();

  if (error) {
    console.error('[vp-stripe-billing-sync] insert vp_subscriptions failed:', error.message);
    throw new Error(`vp_subscriptions insert failed: ${error.message}`);
  }
  return data;
}

function mapStripeInvoiceStatusToVp(status: string | null | undefined): string {
  const s = (status || '').toLowerCase().trim();
  if (s === 'paid' || s === 'open' || s === 'draft' || s === 'void' || s === 'uncollectible') {
    return s;
  }
  if (s === 'refunded') return 'refunded';
  return 'open';
}

export async function upsertVpInvoiceFromStripe(
  admin: AdminClient,
  opts: {
    invoice: Stripe.Invoice;
    userId: string;
    email: string;
    plan?: string | null;
    vpSubscriptionId?: string | null;
  }
): Promise<void> {
  const { invoice, userId, email, plan, vpSubscriptionId } = opts;
  const now = new Date().toISOString();
  const amountCents =
    typeof invoice.amount_paid === 'number' && invoice.amount_paid > 0
      ? invoice.amount_paid
      : typeof invoice.amount_due === 'number'
        ? invoice.amount_due
        : typeof invoice.total === 'number'
          ? invoice.total
          : 0;
  const refundCents =
    typeof invoice.amount_remaining === 'number' && invoice.status === 'paid'
      ? 0
      : typeof (invoice as { amount_refunded?: number }).amount_refunded === 'number'
        ? (invoice as { amount_refunded?: number }).amount_refunded!
        : 0;

  const pdfUrl =
    (typeof invoice.invoice_pdf === 'string' && invoice.invoice_pdf) ||
    (typeof invoice.hosted_invoice_url === 'string' && invoice.hosted_invoice_url) ||
    null;

  const row = {
    user_id: userId,
    user_email: email || '',
    subscription_id: vpSubscriptionId || null,
    plan: plan || toVpPlanId(invoice.metadata?.tier) || null,
    amount: Math.round(amountCents) / 100,
    status: mapStripeInvoiceStatusToVp(invoice.status),
    description: invoice.description || invoice.lines?.data?.[0]?.description || null,
    issued_date: unixToIso(invoice.created) || now,
    due_date: unixToIso(invoice.due_date),
    paid_at: invoice.status === 'paid' ? unixToIso(invoice.status_transitions?.paid_at) || now : null,
    refund_amount: refundCents > 0 ? Math.round(refundCents) / 100 : null,
    stripe_invoice_id: invoice.id,
    metadata: {
      pdf_url: pdfUrl,
      refund_applied: refundCents > 0,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      stripe_subscription_id: invoiceStripeSubscriptionId(invoice),
    },
    updated_at: now,
  };

  const { data: existing } = await admin
    .schema('firstparty')
    .from('vp_invoices')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await admin
      .schema('firstparty')
      .from('vp_invoices')
      .update(row)
      .eq('id', existing.id);
    if (error) {
      console.error('[vp-stripe-billing-sync] update vp_invoices failed:', error.message);
      throw new Error(`vp_invoices update failed: ${error.message}`);
    }
    return;
  }

  const { error } = await admin
    .schema('firstparty')
    .from('vp_invoices')
    .insert({ ...row, created_at: now });
  if (error) {
    console.error('[vp-stripe-billing-sync] insert vp_invoices failed:', error.message);
    throw new Error(`vp_invoices insert failed: ${error.message}`);
  }
}

/** After upserting a subscription, return its UUID for invoice FK. */
export async function findVpSubscriptionIdByStripeId(
  admin: AdminClient,
  stripeSubscriptionId: string
): Promise<string | null> {
  const { data } = await admin
    .schema('firstparty')
    .from('vp_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  return data?.id ?? null;
}

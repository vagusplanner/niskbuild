/**
 * Shared Stripe account serves NiskBuild builder AND Vagus Planner.
 * Product must be inferred from subscription metadata / VP price IDs —
 * never assumed from "any cancel on this customer".
 */

import type Stripe from 'stripe';

/** Live VP self-serve prices (also listed in Billing.jsx / PlanComparison.jsx). */
export const VAGUS_PLANNER_STRIPE_PRICE_IDS = new Set([
  'price_1UEsCtDffiW7XraejBFwVrhM', // basic monthly
  'price_1UEsLZDffiW7XraeShnl44RZ', // basic annual
  'price_1UEsNyDffiW7XraeRSw8DWzq', // pro monthly
  'price_1UEsRXDffiW7Xraegd8wRHJm', // pro annual
  'price_1UEsf1DffiW7Xraec1IYssZQ', // basic islamic monthly
  'price_1UEshtDffiW7XraeDIPGDQL9', // basic islamic annual
  'price_1UEszGDffiW7Xrae5pf4We07', // pro islamic monthly
  'price_1UEt1TDffiW7XraeTRYGtCGr', // pro islamic annual
]);

export type LifecycleProduct = 'niskbuild' | 'vagus-planner';

function firstPriceId(subscription: Stripe.Subscription): string | null {
  const price = subscription.items?.data?.[0]?.price;
  if (!price) return null;
  return typeof price === 'string' ? price : price.id ?? null;
}

function metaSource(subscription: Stripe.Subscription): string {
  return typeof subscription.metadata?.source === 'string'
    ? subscription.metadata.source.trim().toLowerCase()
    : '';
}

function metaTier(subscription: Stripe.Subscription): string {
  return typeof subscription.metadata?.tier === 'string'
    ? subscription.metadata.tier.trim().toLowerCase().replace(/\s+/g, '_')
    : '';
}

export function isVagusPlannerStripeSubscription(subscription: Stripe.Subscription): boolean {
  if (metaSource(subscription) === 'vagus-planner') return true;
  const priceId = firstPriceId(subscription);
  if (priceId && VAGUS_PLANNER_STRIPE_PRICE_IDS.has(priceId)) return true;
  const tier = metaTier(subscription);
  if (tier.includes('islamic')) return true;
  return false;
}

export function lifecycleProductFromSubscription(
  subscription: Stripe.Subscription
): LifecycleProduct {
  return isVagusPlannerStripeSubscription(subscription) ? 'vagus-planner' : 'niskbuild';
}

export function vagusPlannerCancelHadIslamic(subscription: Stripe.Subscription): boolean {
  return metaTier(subscription).includes('islamic');
}

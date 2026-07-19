import Stripe from 'stripe';
import { callInternalApi, vpAppOrigin } from '../internal-fetch';
import type { VpFunctionHandler } from '../types';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { normalizePriceInterval } from '@/lib/stripe-price-ids';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function mapPlanToTier(planName: unknown): string {
  const name = typeof planName === 'string' ? planName.toLowerCase() : 'basic';
  const map: Record<string, string> = {
    basic: 'basic',
    pro: 'pro',
    enterprise: 'team_enterprise',
  };
  return map[name] ?? name;
}

export const createStripeCheckout: VpFunctionHandler = async ({ request, payload }) => {
  const planName = payload.planName;
  const billingCycle = payload.billingCycle;
  const priceIdFromClient =
    typeof payload.priceId === 'string' && payload.priceId.startsWith('price_')
      ? payload.priceId
      : null;

  const tier = mapPlanToTier(planName);
  const interval = normalizePriceInterval(billingCycle);
  const vpOrigin = vpAppOrigin(request);

  if (stripe && priceIdFromClient) {
    try {
      const { user, profile } = await getAuthenticatedProfile();
      if (!user?.email) {
        return { ok: false, error: 'Email is required', status: 400 };
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: user.email,
        subscription_data: {
          metadata: { tier, userId: user.id, interval, source: 'vagus-planner' },
        },
        line_items: [{ price: priceIdFromClient, quantity: 1 }],
        success_url: `${vpOrigin}/Billing?success=true`,
        cancel_url: `${vpOrigin}/Billing?canceled=true`,
        metadata: { userId: user.id, tier, interval, source: 'vagus-planner' },
      };

      const discountPercent = profile?.admin_discount_percent ?? 0;
      if (discountPercent > 0 && discountPercent <= 100) {
        const coupon = await stripe.coupons.create({
          percent_off: discountPercent,
          duration: 'once',
          name: `NiskBuild support discount ${discountPercent}%`,
          metadata: { userId: user.id, source: 'admin_support' },
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { ok: true, data: { sessionUrl: session.url } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout session';
      return { ok: false, error: message, status: 500 };
    }
  }

  const { ok, json } = await callInternalApi(request, '/api/create-checkout', {
    tier,
    interval,
    successUrl: `${vpOrigin}/Billing?success=true`,
    cancelUrl: `${vpOrigin}/Billing?canceled=true`,
  });

  if (!ok) {
    const error = typeof json.error === 'string' ? json.error : 'Failed to create checkout session';
    return { ok: false, error, status: 500 };
  }

  const url = typeof json.url === 'string' ? json.url : null;
  if (!url) {
    return { ok: false, error: 'No checkout URL received', status: 502 };
  }

  return { ok: true, data: { sessionUrl: url } };
};

export const createCustomerPortalSession: VpFunctionHandler = async ({ request }) => {
  const vpOrigin = vpAppOrigin(request);
  const { ok, json } = await callInternalApi(request, '/api/billing/portal', {
    returnUrl: `${vpOrigin}/Billing`,
  });

  if (!ok) {
    const error = typeof json.error === 'string' ? json.error : 'Failed to open billing portal';
    return { ok: false, error, status: 500 };
  }

  const url = typeof json.url === 'string' ? json.url : null;
  if (!url) {
    return { ok: false, error: 'No portal URL received', status: 502 };
  }

  return { ok: true, data: { portalUrl: url } };
};

export const cancelStripeSubscription: VpFunctionHandler = async ({ user, payload }) => {
  const subscriptionId =
    typeof payload.subscriptionId === 'string' ? payload.subscriptionId.trim() : '';

  if (!subscriptionId) {
    return { ok: false, error: 'subscriptionId is required', status: 400 };
  }

  if (!stripe) {
    return { ok: false, error: 'Stripe is not configured', status: 503 };
  }

  const supabase = await createClient();
  const { data: owned } = await supabase
    .schema('firstparty')
    .from('vp_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (!owned) {
    return { ok: false, error: 'Subscription not found', status: 404 };
  }

  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

    // Writes require service_role after select-only RLS hardening
    const admin = createAdminClient();
    await admin
      .schema('firstparty')
      .from('vp_subscriptions')
      .update({
        auto_renew: false,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('stripe_subscription_id', subscriptionId);

    return { ok: true, data: { canceled: true, atPeriodEnd: true } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
    return { ok: false, error: message, status: 500 };
  }
};

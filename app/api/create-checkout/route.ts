import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { createClient } from '@/lib/supabase/server';
import { getReloadPack } from '@/lib/reload-packs';
import { isPaidAndActive } from '@/lib/tier-config';
import {
  getPriceId,
  getReloadPriceId,
  getReloadPriceIdByPackId,
  getSovereignSetupPriceId,
  normalizePriceInterval,
  type ReloadBoost,
} from '@/lib/stripe-price-ids';
import { PACK_ID_TO_BOOST } from '@/lib/reload-packs';

const BOOST_TO_PACK_ID: Record<ReloadBoost, string> = {
  light: 'boost_100',
  mid: 'boost_250',
  sprint: 'boost_500',
  power: 'boost_1000',
};

const VALID_BOOSTS = new Set<ReloadBoost>(['light', 'mid', 'sprint', 'power']);

function resolveBoostType(boostType?: unknown, packId?: unknown): ReloadBoost | null {
  if (typeof packId === 'string' && PACK_ID_TO_BOOST[packId]) {
    return PACK_ID_TO_BOOST[packId];
  }
  if (typeof boostType === 'string' && VALID_BOOSTS.has(boostType as ReloadBoost)) {
    return boostType as ReloadBoost;
  }
  return null;
}

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      tier,
      interval: rawInterval,
      isReload = false,
      boostType,
      packId,
      successUrl,
      cancelUrl,
    } = body;

    const interval = normalizePriceInterval(rawInterval);
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
    }

    const userId = user.id;
    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ── Reload pack checkout (Step 6) ──────────────────────────────────────
    if (isReload) {
      const boost = resolveBoostType(boostType, packId);
      if (!boost) {
        return NextResponse.json({ error: 'Invalid reload pack' }, { status: 400 });
      }

      const resolvedPackId =
        typeof packId === 'string' ? packId : BOOST_TO_PACK_ID[boost];
      const pack = getReloadPack(resolvedPackId);
      const priceId =
        getReloadPriceId(boost) ||
        (resolvedPackId ? getReloadPriceIdByPackId(resolvedPackId) : null);

      if (!priceId) {
        return NextResponse.json({ error: 'Invalid price configuration' }, { status: 400 });
      }

      const supabase = await createClient();
      const { data: subProfile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', userId)
        .single();

      if (!isPaidAndActive(subProfile?.subscription_tier, subProfile?.subscription_status)) {
        return NextResponse.json(
          { error: 'Active paid subscription required to purchase reload packs' },
          { status: 403 }
        );
      }

      const credits = pack?.credits ?? 0;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/settings?reload=success&credits=${credits}`,
        cancel_url: `${appUrl}/pricing?reload_canceled=true`,
        metadata: {
          type: 'reload',
          packId: pack?.id || packId || boost,
          credits: String(credits),
          userId,
          boostType: boost,
          isReload: 'true',
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Subscription checkout (Steps 2 & 5) ──────────────────────────────
    if (!tier || typeof tier !== 'string') {
      return NextResponse.json({ error: 'Subscription tier is required' }, { status: 400 });
    }

    const priceId = getPriceId(tier, interval);
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid price configuration' }, { status: 400 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    if (tier === 'sovereign') {
      const setupPriceId = getSovereignSetupPriceId();
      if (setupPriceId) {
        lineItems.push({ price: setupPriceId, quantity: 1 });
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      subscription_data: {
        metadata: { tier, userId, interval },
      },
      line_items: lineItems,
      success_url: successUrl || `${appUrl}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${appUrl}/pricing?checkout=cancel`,
      metadata: {
        userId,
        tier,
        interval,
        isReload: 'false',
      },
    };

    const discountPercent = profile?.admin_discount_percent ?? 0;
    if (discountPercent > 0 && discountPercent <= 100) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        name: `NiskBuild support discount ${discountPercent}%`,
        metadata: { userId, source: 'admin_support' },
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    captureApiException(error);
    console.error('Checkout error:', error);
    const stripeMessage =
      error instanceof Stripe.errors.StripeError ? error.message : null;
    const message =
      process.env.NODE_ENV === 'development' && stripeMessage
        ? stripeMessage
        : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

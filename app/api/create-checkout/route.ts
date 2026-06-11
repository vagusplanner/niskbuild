import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { guardApiRequest } from '@/lib/api-auth';
import { getStripePriceId } from '@/lib/stripe-price-ids';

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
    const { tier, successUrl, cancelUrl } = await request.json();
    const userId = guard.user!.id;
    const email = guard.user!.email;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!tier || typeof tier !== 'string') {
      return NextResponse.json({ error: 'Subscription tier is required' }, { status: 400 });
    }

    const priceId = getStripePriceId(tier);
    if (!priceId) {
      const enterpriseTiers = new Set(['team_enterprise', 'sovereign']);
      return NextResponse.json(
        {
          error: enterpriseTiers.has(tier)
            ? 'This plan requires a sales conversation. Use Contact Sales on the pricing page.'
            : `Checkout is not configured for the ${tier} plan. Contact support.`,
        },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      subscription_data: {
        metadata: { tier, userId },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId,
        tier: tier,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    const stripeMessage =
      error instanceof Stripe.errors.StripeError ? error.message : null;
    const message =
      process.env.NODE_ENV === 'development' && stripeMessage
        ? stripeMessage
        : 'Failed to create checkout session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
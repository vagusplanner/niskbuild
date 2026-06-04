import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Map tier to price ID
const getPriceId = (tier: string): string => {
  switch (tier) {
    case 'pro':
      return process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
    case 'agency':
      return process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID!;
    case 'scale':
      return process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID!;
    case 'white_label':
      return process.env.NEXT_PUBLIC_STRIPE_WHITE_PRICE_ID!;
    default:
      return process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!;
  }
};

export async function POST(request: NextRequest) {
  try {
    const { userId, email, tier, successUrl, cancelUrl } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const priceId = getPriceId(tier);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: userId || '',
        tier: tier,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
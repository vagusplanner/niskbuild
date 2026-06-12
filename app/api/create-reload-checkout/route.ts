import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { getReloadPack } from '@/lib/reload-packs';
import { isPaidAndActive } from '@/lib/tier-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { packId } = await request.json();

    const pack = getReloadPack(packId);
    if (!pack) {
      return NextResponse.json({ error: 'Invalid reload pack' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = guard.user!;

    if (!user.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (!isPaidAndActive(profile?.subscription_tier, profile?.subscription_status)) {
      return NextResponse.json(
        { error: 'Active paid subscription required to purchase reload packs' },
        { status: 403 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: pack.priceUsd * 100,
            product_data: {
              name: `NiskBuild Reload: ${pack.name}`,
              description: `${pack.credits} cloud credits — ${pack.description}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/settings?reload=success&credits=${pack.credits}`,
      cancel_url: `${appUrl}/pricing?reload_canceled=true`,
      metadata: {
        type: 'reload',
        packId: pack.id,
        credits: String(pack.credits),
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create checkout');
  }
}

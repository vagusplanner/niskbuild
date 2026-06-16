import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { getReloadPack, PACK_ID_TO_BOOST } from '@/lib/reload-packs';
import { getReloadPriceId, getReloadPriceIdByPackId } from '@/lib/stripe-price-ids';
import { isPaidAndActive } from '@/lib/tier-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Legacy route — prefer POST /api/create-checkout with { isReload: true, packId } */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { packId } = await request.json();

    const pack = getReloadPack(packId);
    if (!pack) {
      return NextResponse.json({ error: 'Invalid reload pack' }, { status: 400 });
    }

    const boostType = PACK_ID_TO_BOOST[packId];
    const stripePriceId =
      (boostType ? getReloadPriceId(boostType) : null) || getReloadPriceIdByPackId(packId);

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

    if (!stripePriceId) {
      return NextResponse.json({ error: 'Invalid price configuration' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?reload=success&credits=${pack.credits}`,
      cancel_url: `${appUrl}/pricing?reload_canceled=true`,
      metadata: {
        type: 'reload',
        packId: pack.id,
        credits: String(pack.credits),
        userId: user.id,
        boostType: boostType || '',
        isReload: 'true',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create checkout');
  }
}

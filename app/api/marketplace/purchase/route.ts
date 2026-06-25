import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import {
  isListingOwned,
  fetchUserLegacyPurchasedIds,
  fetchUserPurchasedListingIds,
  fetchUserSubscriptionTier,
  resolvePurchasableItem,
} from '@/lib/marketplace-service';
import { listingIncludedInTier } from '@/lib/marketplace-types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { templateId } = await request.json();

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = guard.user!;

    const resolved = await resolvePurchasableItem(supabase, templateId);
    if (!resolved) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { item: template, listingRow } = resolved;

    if (template.price === 0) {
      return NextResponse.json({ error: 'This template is free' }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const [tier, purchasedListingIds, legacyIds] = await Promise.all([
      fetchUserSubscriptionTier(supabase, user.id),
      fetchUserPurchasedListingIds(supabase, user.id),
      fetchUserLegacyPurchasedIds(supabase, user.id),
    ]);

    if (
      isListingOwned(template, tier, purchasedListingIds, legacyIds) ||
      listingIncludedInTier(template, tier, legacyIds)
    ) {
      return NextResponse.json({ alreadyOwned: true });
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
            unit_amount: template.price * 100,
            product_data: {
              name: `NiskBuild Template: ${template.name}`,
              description: template.description.slice(0, 200),
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/marketplace?purchased=${template.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/marketplace?canceled=true`,
      metadata: {
        type: 'template',
        templateId: template.id,
        listingId: listingRow?.id ?? '',
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to start checkout');
  }
}

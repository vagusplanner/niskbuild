import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { fulfillTemplatePurchase } from '@/lib/marketplace-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const user = guard.user!;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 });
    }

    if (session.metadata?.type !== 'template' || session.metadata.userId !== user.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
    }

    const templateId = session.metadata.templateId;
    const listingId = session.metadata.listingId || undefined;

    if (!templateId) {
      return NextResponse.json({ error: 'Missing template' }, { status: 400 });
    }

    const result = await fulfillTemplatePurchase(supabase, {
      userId: user.id,
      templateId,
      listingId: listingId || undefined,
      stripePaymentId: session.payment_intent?.toString() ?? session.id,
    });

    return NextResponse.json({
      success: result.success,
      templateId: result.resolvedTemplateId ?? templateId,
      clonedProjectId: result.clonedProjectId ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to confirm purchase');
  }
}

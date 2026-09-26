import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureProfileForUser } from '@/lib/ensure-profile';
import { resolveRequestUser } from '@/lib/shift-ai/student-auth';
import { isMultiCurriculumEligible } from '@/lib/shift-ai/multi-curriculum';
import {
  normalizeSe8Interval,
  resolveSe8ChildPriceId,
  resolveSe8StudentPriceId,
  SE8_MULTI_CURRICULUM_COUPON_ID,
  type Se8PlanId,
} from '@/lib/se8-stripe-price-ids';
import { getSuperEduc8Origin } from '@/lib/supereduc8-host';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

function stripeCustomerFields(
  profile: { stripe_customer_id?: string | null } | null,
  email: string
): Pick<Stripe.Checkout.SessionCreateParams, 'customer' | 'customer_email'> {
  const customerId = profile?.stripe_customer_id?.trim();
  if (customerId) {
    return { customer: customerId };
  }
  return { customer_email: email };
}

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

/**
 * POST /api/shift-ai/create-checkout
 * Body: { plan?: 'student'|'family', interval?: 'month'|'year', childQuantity?: number }
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return shiftAiApiJson(
      request,
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' },
      { status: 503 }
    );
  }

  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const interval = normalizeSe8Interval(payload.interval ?? payload.billingCycle);
  const rawChildQty = Number(payload.childQuantity ?? payload.additionalChildren ?? 0);
  const childQuantity =
    Number.isFinite(rawChildQty) && rawChildQty > 0 ? Math.min(Math.floor(rawChildQty), 20) : 0;

  const planFromBody =
    typeof payload.plan === 'string' ? payload.plan.trim().toLowerCase() : '';
  const plan: Se8PlanId =
    planFromBody === 'family' || childQuantity > 0 ? 'family' : 'student';

  const email =
    (typeof user.email === 'string' && user.email.trim()) ||
    '';

  await ensureProfileForUser({
    userId: user.id,
    email: email || null,
  });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const checkoutEmail =
    email ||
    (typeof profile?.email === 'string' && profile.email.trim()) ||
    '';

  if (!checkoutEmail) {
    return shiftAiApiJson(request, { error: 'Email is required' }, { status: 400 });
  }

  const { eligible: multiCurriculum, curricula } = await isMultiCurriculumEligible(
    admin,
    user.id
  );

  const studentPrice = resolveSe8StudentPriceId(interval);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: studentPrice, quantity: 1 },
  ];

  if (childQuantity > 0) {
    lineItems.push({
      price: resolveSe8ChildPriceId(interval),
      quantity: childQuantity,
    });
  }

  const origin = getSuperEduc8Origin();
  const successUrl =
    typeof payload.successUrl === 'string' && payload.successUrl.startsWith('http')
      ? payload.successUrl
      : `${origin}/billing?checkout=success`;
  const cancelUrl =
    typeof payload.cancelUrl === 'string' && payload.cancelUrl.startsWith('http')
      ? payload.cancelUrl
      : `${origin}/billing?checkout=canceled`;

  const metadata: Record<string, string> = {
    userId: user.id,
    source: 'supereduc8',
    plan,
    interval,
    childQuantity: String(childQuantity),
    multiCurriculum: multiCurriculum ? 'true' : 'false',
    curricula: curricula.join(','),
  };

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      ...stripeCustomerFields(profile, checkoutEmail),
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: {
        metadata,
      },
      allow_promotion_codes: !multiCurriculum,
    };

    if (multiCurriculum && SE8_MULTI_CURRICULUM_COUPON_ID) {
      sessionParams.discounts = [{ coupon: SE8_MULTI_CURRICULUM_COUPON_ID }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Persist stripe_customer_id on profiles when Checkout creates/attaches a customer
    if (typeof session.customer === 'string' && session.customer) {
      await admin
        .from('profiles')
        .update({ stripe_customer_id: session.customer })
        .eq('id', user.id)
        .is('stripe_customer_id', null);
    }

    return shiftAiApiJson(request, {
      ok: true,
      sessionUrl: session.url,
      sessionId: session.id,
      plan,
      interval,
      childQuantity,
      multiCurriculum,
      curricula,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    console.error('[se8-create-checkout] failed:', message);
    return shiftAiApiJson(request, { error: message }, { status: 500 });
  }
}

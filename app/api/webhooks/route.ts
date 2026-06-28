import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { captureApiException } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { addCloudCredits } from '@/lib/credits';
import { canUseOwnApiKeys, getCloudCreditsForTier } from '@/lib/tier-config';
import {
  deactivatePreviewsByEmail,
  deactivatePreviewsForUser,
  reactivatePreviewsForUser,
} from '@/lib/preview-links';
import { resetCreditAlertFlags } from '@/lib/usage-alerts';
import { resetBuildsThisPeriod } from '@/lib/build-activity';
import {
  sendCancelWarningEmail,
  sendPaymentFailedEmail,
  sendUpgradeConfirmedEmail,
} from '@/lib/email/lifecycle';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const INACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'past_due',
  'incomplete_expired',
]);

function profileUpdatesForTier(
  tier: string,
  customerId?: string | null,
  subscriptionId?: string | null
) {
  return {
    subscription_tier: tier,
    subscription_status: 'active' as const,
    cloud_credits_remaining: getCloudCreditsForTier(tier),
    credit_alert_80_sent: false,
    credit_alert_100_sent: false,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
    ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
  };
}

async function resolveUserIdByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
  return data?.id ?? null;
}

async function handleSubscriptionActivated(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  userId?: string | null
) {
  const uid = userId || (await resolveUserIdByEmail(supabase, email));
  if (uid) {
    await resetCreditAlertFlags(uid);
    await reactivatePreviewsForUser(uid);
  }
}

async function handleSubscriptionEnded(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  userId?: string | null
) {
  const uid = userId || (await resolveUserIdByEmail(supabase, email));
  if (uid) {
    await deactivatePreviewsForUser(uid);
  } else {
    await deactivatePreviewsByEmail(email);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Stripe webhook endpoint. Stripe sends signed POST requests only.',
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      if (!sig) {
        return NextResponse.json(
          {
            error:
              'Missing Stripe-Signature header. Use Stripe Dashboard "Send test webhook" or `stripe listen --forward-to localhost:3000/api/webhooks`.',
          },
          { status: 400 }
        );
      }
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else if (process.env.NODE_ENV === 'development') {
      event = JSON.parse(body) as Stripe.Event;
    } else {
      return NextResponse.json(
        { error: 'STRIPE_WEBHOOK_SECRET is not configured' },
        { status: 503 }
      );
    }
  } catch (err) {
    const message =
      err instanceof Stripe.errors.StripeSignatureVerificationError
        ? 'Invalid Stripe webhook signature. Confirm STRIPE_WEBHOOK_SECRET matches the signing secret for this endpoint in Stripe Dashboard.'
        : 'Webhook payload could not be verified';
    console.error('Webhook verification failed:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (session.metadata?.type === 'reload' && userId) {
      const credits = parseInt(session.metadata.credits || '0', 10);
      if (credits > 0) {
        await addCloudCredits(userId, credits);
        console.log(`✅ User ${userId} purchased ${credits} reload credits`);
      }
    } else if (session.metadata?.type === 'template' && userId) {
      const templateId = session.metadata.templateId;
      const listingId = session.metadata.listingId || undefined;
      if (templateId) {
        const { fulfillTemplatePurchase } = await import('@/lib/marketplace-service');
        await fulfillTemplatePurchase(supabase, {
          userId,
          templateId,
          listingId: listingId || undefined,
          stripePaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.id,
        });
        console.log(`✅ User ${userId} purchased template ${templateId}`);
      }
    } else if (session.mode === 'subscription') {
      const customerEmail = session.customer_email;
      const tier = session.metadata?.tier || 'pro';
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      const updates = {
        ...profileUpdatesForTier(tier, customerId, subscriptionId ?? null),
        ...(!canUseOwnApiKeys(tier) ? { use_own_api_keys: false } : {}),
      };

      if (userId) {
        await supabase.from('profiles').update(updates).eq('id', userId);
        await handleSubscriptionActivated(supabase, customerEmail || '', userId);
        if (customerEmail) {
          void sendUpgradeConfirmedEmail(userId, customerEmail, tier);
        }
        console.log(`✅ User ${userId} upgraded to ${tier} (${updates.cloud_credits_remaining} credits)`);
      } else if (customerEmail) {
        await supabase.from('profiles').update(updates).eq('email', customerEmail);
        await handleSubscriptionActivated(supabase, customerEmail);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();
        if (profile?.id) {
          void sendUpgradeConfirmedEmail(profile.id, customerEmail, tier);
        }
        console.log(`✅ User ${customerEmail} upgraded to ${tier} (${updates.cloud_credits_remaining} credits)`);
      }
    }
  }

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email && subscription.status === 'active') {
        const tier = subscription.metadata?.tier || 'pro';
        await supabase
          .from('profiles')
          .update(profileUpdatesForTier(tier, customerId, subscription.id))
          .eq('email', customer.email);
        await handleSubscriptionActivated(supabase, customer.email);
      }
    } catch (err) {
      captureApiException(err);
      console.error('Subscription created error:', err);
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const status = subscription.status;
    const tier = subscription.metadata?.tier || 'pro';

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email) {
        if (status === 'active') {
          await supabase
            .from('profiles')
            .update({
              ...profileUpdatesForTier(tier, customerId, subscription.id),
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
              subscription_ended_at: null,
            })
            .eq('email', customer.email);
          await handleSubscriptionActivated(supabase, customer.email);

          if (subscription.cancel_at_period_end) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', customer.email)
              .single();
            if (profile?.id) {
              void sendCancelWarningEmail(profile.id, customer.email);
            }
          }
        } else if (INACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: 'free',
              subscription_status: 'inactive',
              cloud_credits_remaining: 0,
              use_own_api_keys: false,
              subscription_id: subscription.id,
              stripe_customer_id: customerId,
              cancel_at_period_end: false,
              subscription_ended_at: new Date().toISOString(),
            })
            .eq('email', customer.email);
          await handleSubscriptionEnded(supabase, customer.email);
          console.log(`📉 Previews deactivated for ${customer.email} (subscription ${status})`);
        }
      }
    } catch (err) {
      captureApiException(err);
      console.error('Subscription update error:', err);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            cloud_credits_remaining: 0,
            use_own_api_keys: false,
            cancel_at_period_end: false,
            subscription_ended_at: new Date().toISOString(),
          })
          .eq('email', customer.email);

        await handleSubscriptionEnded(supabase, customer.email);
        console.log(`📉 User ${customer.email} downgraded — preview links expired`);
      }
    } catch (err) {
      captureApiException(err);
      console.error('Error processing cancellation:', err);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return NextResponse.json({ received: true });

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) return NextResponse.json({ received: true });

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, id')
        .eq('email', customer.email)
        .single();

      const tier = profile?.subscription_tier || 'pro';
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          cloud_credits_remaining: getCloudCreditsForTier(tier),
          credit_alert_80_sent: false,
          credit_alert_100_sent: false,
        })
        .eq('email', customer.email);

      if (profile?.id) {
        await resetCreditAlertFlags(profile.id);
        await resetBuildsThisPeriod(profile.id);
      }

      console.log(`🔄 Credits refreshed for ${customer.email} on invoice.paid`);
    } catch (err) {
      captureApiException(err);
      console.error('Invoice paid handler error:', err);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return NextResponse.json({ received: true });

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) return NextResponse.json({ received: true });

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customer.email)
        .single();

      if (profile?.id) {
        void sendPaymentFailedEmail(profile.id, customer.email);
      }
    } catch (err) {
      captureApiException(err);
      console.error('Invoice payment_failed handler error:', err);
    }
  }

  return NextResponse.json({ received: true });
}

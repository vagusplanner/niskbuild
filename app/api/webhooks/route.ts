import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { PostgrestError } from '@supabase/supabase-js';
import { captureApiException } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { addCloudCredits } from '@/lib/credits';
import { getCloudCreditsForTier } from '@/lib/tier-config';
import {
  canUseOwnApiKeys,
  canUseWhiteLabelBranding,
  isAgencyStudioOrAbove,
  resolveProductGatingBypass,
} from '@/lib/tier-access-server';
import {
  deactivatePreviewsByEmail,
  deactivatePreviewsForUser,
  reactivatePreviewsIfPaidAndActive,
} from '@/lib/preview-links';
import { resetCreditAlertFlags } from '@/lib/usage-alerts';
import { resetBuildsThisPeriod } from '@/lib/build-activity';
import {
  sendCancelWarningEmail,
  sendPaymentFailedEmail,
  sendUpgradeConfirmedEmail,
} from '@/lib/email/lifecycle';
import { resolveTierFromSubscription } from '@/lib/stripe-price-ids';
import { notifyOrgsAfterBillingOwnerPlanChange } from '@/lib/org-billing-lifecycle';
import { ensureSoloOrganizationForUser } from '@/lib/ensure-organization';
import {
  findVpSubscriptionIdByStripeId,
  resolveVpBillingUser,
  toVpPlanId,
  upsertVpInvoiceFromStripe,
  upsertVpSubscriptionFromStripe,
} from '@/lib/vp-stripe-billing-sync';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function stripeInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = (invoice as Stripe.Invoice & { subscription?: string | { id?: string } | null })
    .subscription;
  if (typeof sub === 'string' && sub) return sub;
  if (sub && typeof sub === 'object' && typeof sub.id === 'string') return sub.id;
  const parent = (
    invoice as Stripe.Invoice & {
      parent?: { subscription_details?: { subscription?: string | null } | null } | null;
    }
  ).parent;
  const fromParent = parent?.subscription_details?.subscription;
  if (typeof fromParent === 'string' && fromParent) return fromParent;
  return null;
}

/** Mirror Stripe state into firstparty.vp_* for Vagus Planner Billing UI. */
async function syncVpBillingFromSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    subscription: Stripe.Subscription;
    userId?: string | null;
    email?: string | null;
    fallbackTier?: string | null;
    forceCanceled?: boolean;
  }
): Promise<string | null> {
  const customerId =
    typeof opts.subscription.customer === 'string'
      ? opts.subscription.customer
      : opts.subscription.customer?.id ?? null;
  const user = await resolveVpBillingUser(supabase, {
    userId: opts.userId,
    email: opts.email,
    customerId,
  });
  if (!user?.userId) {
    console.warn(
      '[vp-billing] skip vp_subscriptions sync — no profile for',
      opts.email || opts.userId || customerId
    );
    return null;
  }
  const row = await upsertVpSubscriptionFromStripe(supabase, {
    subscription: opts.subscription,
    userId: user.userId,
    email: user.email || opts.email || '',
    fallbackTier: opts.fallbackTier,
    forceCanceled: opts.forceCanceled,
  });
  return row?.id ?? null;
}

/** Terminal subscription states — immediate downgrade (excludes past_due grace period). */
const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'incomplete_expired',
]);

class WebhookProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookProcessingError';
  }
}

async function requireProfileUpdate(
  result: PromiseLike<{ error: PostgrestError | null }>
): Promise<void> {
  const { error } = await result;
  if (error) {
    throw new WebhookProcessingError(`Profile update failed: ${error.message}`);
  }
}

/** New checkout / first subscription — includes full monthly credit grant. */
function profileUpdatesForNewSubscription(
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

/** Subscription sync (portal plan change, cancel flag) — never resets credits. */
function profileUpdatesForSubscriptionSync(
  tier: string,
  customerId?: string | null,
  subscriptionId?: string | null
) {
  return {
    subscription_tier: tier,
    subscription_status: 'active' as const,
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

async function notifyOrgPlanSideEffects(email: string, userId?: string | null) {
  const ownerId = userId || null;
  const supabase = createAdminClient();
  const uid = ownerId || (await resolveUserIdByEmail(supabase, email));
  if (!uid) return;
  void notifyOrgsAfterBillingOwnerPlanChange({
    ownerId: uid,
    ownerEmail: email,
  }).catch((err) => {
    console.error('org billing lifecycle notify failed:', err);
  });
}

async function handleSubscriptionActivated(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  userId?: string | null
) {
  const uid = userId || (await resolveUserIdByEmail(supabase, email));
  if (!uid) return;

  await resetCreditAlertFlags(uid);

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, email')
    .eq('id', uid)
    .maybeSingle();

  await reactivatePreviewsIfPaidAndActive(
    uid,
    profile?.subscription_tier,
    profile?.subscription_status
  );

  const ownerBypass = await resolveProductGatingBypass(uid);

  // Phase 0: Agency+ (incl. White-Label+) get a solo org if missing
  if (
    isAgencyStudioOrAbove(profile?.subscription_tier, profile?.subscription_status, ownerBypass)
  ) {
    const ensured = await ensureSoloOrganizationForUser({
      userId: uid,
      email: (profile?.email as string) || email,
      tier: profile?.subscription_tier as string,
      status: profile?.subscription_status as string,
    }).catch((err) => {
      console.error('ensureSoloOrganizationForUser failed:', err);
      return null;
    });

    // Option B: on first WL+ activation, enable attribution removal if still default false
    // and no branding customized yet (do not clobber an explicit user preference later).
    if (
      ensured &&
      canUseWhiteLabelBranding(
        profile?.subscription_tier,
        profile?.subscription_status,
        ownerBypass
      )
    ) {
      await supabase
        .from('organizations')
        .update({ hide_niskbuild_attribution: true })
        .eq('id', ensured.orgId)
        .eq('hide_niskbuild_attribution', false)
        .is('brand_app_name', null)
        .is('brand_logo_url', null);
    }
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

async function processStripeEvent(
  event: Stripe.Event,
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (session.metadata?.type === 'reload' && userId) {
      const credits = parseInt(session.metadata.credits || '0', 10);
      if (credits > 0) {
        const creditResult = await addCloudCredits(userId, credits);
        if (!creditResult.ok) {
          throw new WebhookProcessingError(`Reload credit grant failed for user ${userId}`);
        }
        console.log(`✅ User ${userId} purchased ${credits} reload credits`);
      }
    } else if (session.metadata?.type === 'template' && userId) {
      const templateId = session.metadata.templateId;
      const listingId = session.metadata.listingId || undefined;
      if (templateId) {
        const { fulfillTemplatePurchase } = await import('@/lib/marketplace-service');
        const result = await fulfillTemplatePurchase(supabase, {
          userId,
          templateId,
          listingId: listingId || undefined,
          stripePaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.id,
        });
        if (!result.success) {
          throw new WebhookProcessingError(
            `Template purchase fulfillment failed for ${userId} (${templateId}): ${result.error}`
          );
        }
        console.log(`✅ User ${userId} purchased template ${templateId}`);
      }
    } else if (session.mode === 'subscription') {
      const customerEmail = session.customer_email;
      const tier = session.metadata?.tier || 'pro';
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      let profileUserId = typeof userId === 'string' ? userId : null;
      if (!profileUserId && customerEmail) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .maybeSingle();
        profileUserId = existing?.id ?? null;
      }
      const ownerBypass = profileUserId
        ? await resolveProductGatingBypass(profileUserId)
        : false;

      const updates = {
        ...profileUpdatesForNewSubscription(tier, customerId, subscriptionId ?? null),
        ...(!canUseOwnApiKeys(tier, ownerBypass) ? { use_own_api_keys: false } : {}),
      };

      if (userId) {
        await requireProfileUpdate(supabase.from('profiles').update(updates).eq('id', userId));
        await handleSubscriptionActivated(supabase, customerEmail || '', userId);
        if (customerEmail) {
          const emailOk = await sendUpgradeConfirmedEmail(userId, customerEmail, tier);
          if (!emailOk) {
            console.error(
              `Upgrade confirmation email not sent for user ${userId} (${customerEmail})`
            );
          }
          notifyOrgPlanSideEffects(customerEmail, userId);
        }
        console.log(`✅ User ${userId} upgraded to ${tier} (${updates.cloud_credits_remaining} credits)`);
      } else if (customerEmail) {
        await requireProfileUpdate(
          supabase.from('profiles').update(updates).eq('email', customerEmail)
        );
        await handleSubscriptionActivated(supabase, customerEmail);
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single();
        if (profile?.id) {
          const emailOk = await sendUpgradeConfirmedEmail(profile.id, customerEmail, tier);
          if (!emailOk) {
            console.error(
              `Upgrade confirmation email not sent for user ${profile.id} (${customerEmail})`
            );
          }
          notifyOrgPlanSideEffects(customerEmail, profile.id);
        }
        console.log(`✅ User ${customerEmail} upgraded to ${tier} (${updates.cloud_credits_remaining} credits)`);
      }

      // VP Billing UI reads firstparty.vp_subscriptions — mirror Stripe after profile update.
      if (subscriptionId) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          await syncVpBillingFromSubscription(supabase, {
            subscription: stripeSub,
            userId: typeof userId === 'string' ? userId : profileUserId,
            email: customerEmail,
            fallbackTier: tier,
          });
        } catch (err) {
          console.error('[vp-billing] checkout.session.completed vp sync failed:', err);
          throw err instanceof Error
            ? err
            : new WebhookProcessingError('Failed to sync vp_subscriptions after checkout');
        }
      }
    }
    return;
  }

  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email && subscription.status === 'active') {
      const tier = resolveTierFromSubscription(subscription);
      await requireProfileUpdate(
        supabase
          .from('profiles')
          .update(profileUpdatesForNewSubscription(tier, customerId, subscription.id))
          .eq('email', customer.email)
      );
      await handleSubscriptionActivated(supabase, customer.email);
      await syncVpBillingFromSubscription(supabase, {
        subscription,
        email: customer.email,
        fallbackTier: tier,
      });
    } else if (!customer.deleted) {
      // Still mirror VP row for trialing / incomplete so Billing UI is not stuck on Free.
      await syncVpBillingFromSubscription(supabase, {
        subscription,
        email: !customer.deleted ? customer.email : null,
        userId:
          typeof subscription.metadata?.userId === 'string' ? subscription.metadata.userId : null,
        fallbackTier: resolveTierFromSubscription(subscription),
      });
    }
    return;
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;
    const status = subscription.status;
    const tier = resolveTierFromSubscription(subscription);

    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      const { data: syncProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', customer.email)
        .maybeSingle();
      const ownerBypass = syncProfile?.id
        ? await resolveProductGatingBypass(syncProfile.id)
        : false;

      if (status === 'active') {
        await requireProfileUpdate(
          supabase
            .from('profiles')
            .update({
              ...profileUpdatesForSubscriptionSync(tier, customerId, subscription.id),
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
              subscription_ended_at: null,
              ...(!canUseOwnApiKeys(tier, ownerBypass) ? { use_own_api_keys: false } : {}),
            })
            .eq('email', customer.email)
        );
        await handleSubscriptionActivated(supabase, customer.email);

        if (subscription.cancel_at_period_end) {
          if (syncProfile?.id) {
            void sendCancelWarningEmail(syncProfile.id, customer.email);
          }
        }
        notifyOrgPlanSideEffects(customer.email);
      } else if (status === 'past_due') {
        await requireProfileUpdate(
          supabase
            .from('profiles')
            .update({
              subscription_tier: tier,
              subscription_status: 'past_due',
              stripe_customer_id: customerId,
              subscription_id: subscription.id,
              cancel_at_period_end: subscription.cancel_at_period_end ?? false,
            })
            .eq('email', customer.email)
        );
        console.log(`⚠️ Subscription past_due for ${customer.email} — tier kept, grace period active`);
      } else if (TERMINAL_SUBSCRIPTION_STATUSES.has(status)) {
        await requireProfileUpdate(
          supabase
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
            .eq('email', customer.email)
        );
        await handleSubscriptionEnded(supabase, customer.email);
        console.log(`📉 Previews deactivated for ${customer.email} (subscription ${status})`);
        notifyOrgPlanSideEffects(customer.email);
      }

      await syncVpBillingFromSubscription(supabase, {
        subscription,
        userId: syncProfile?.id,
        email: customer.email,
        fallbackTier: tier,
        forceCanceled: TERMINAL_SUBSCRIPTION_STATUSES.has(status),
      });
    }
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      await requireProfileUpdate(
        supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            cloud_credits_remaining: 0,
            use_own_api_keys: false,
            cancel_at_period_end: false,
            subscription_ended_at: new Date().toISOString(),
          })
          .eq('email', customer.email)
      );

      await handleSubscriptionEnded(supabase, customer.email);
      console.log(`📉 User ${customer.email} downgraded — preview links expired`);
      notifyOrgPlanSideEffects(customer.email);

      await syncVpBillingFromSubscription(supabase, {
        subscription,
        email: customer.email,
        forceCanceled: true,
      });
    }
    return;
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_id, id')
      .eq('email', customer.email)
      .single();

    let resolvedTier = profile?.subscription_tier || 'pro';
    const invoiceSubId = stripeInvoiceSubscriptionId(invoice);
    const subscriptionId =
      invoiceSubId ||
      (typeof profile?.subscription_id === 'string' ? profile.subscription_id.trim() : '');
    let stripeSub: Stripe.Subscription | null = null;
    if (subscriptionId) {
      try {
        stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        resolvedTier = resolveTierFromSubscription(stripeSub);
      } catch {
        // keep profile tier
      }
    }

    await requireProfileUpdate(
      supabase
        .from('profiles')
        .update({
          subscription_tier: resolvedTier,
          subscription_status: 'active',
          cloud_credits_remaining: getCloudCreditsForTier(resolvedTier),
          credit_alert_80_sent: false,
          credit_alert_100_sent: false,
        })
        .eq('email', customer.email)
    );

    if (profile?.id) {
      await resetCreditAlertFlags(profile.id);
      await resetBuildsThisPeriod(profile.id);
      await reactivatePreviewsIfPaidAndActive(profile.id, resolvedTier, 'active');
      await ensureSoloOrganizationForUser({
        userId: profile.id,
        email: customer.email,
        tier: resolvedTier,
        status: 'active',
      }).catch((err) => console.error('ensureSoloOrganizationForUser:', err));
      notifyOrgPlanSideEffects(customer.email, profile.id);
    }

    const user = await resolveVpBillingUser(supabase, {
      userId: profile?.id,
      email: customer.email,
      customerId,
    });
    if (user?.userId) {
      let vpSubId: string | null = null;
      if (stripeSub) {
        await upsertVpSubscriptionFromStripe(supabase, {
          subscription: stripeSub,
          userId: user.userId,
          email: user.email || customer.email,
          fallbackTier: resolvedTier,
        });
        vpSubId = await findVpSubscriptionIdByStripeId(supabase, stripeSub.id);
      }
      await upsertVpInvoiceFromStripe(supabase, {
        invoice,
        userId: user.userId,
        email: user.email || customer.email,
        plan: toVpPlanId(resolvedTier),
        vpSubscriptionId: vpSubId,
      });
    }

    console.log(`🔄 Credits refreshed for ${customer.email} on invoice.paid (tier: ${resolvedTier})`);
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, subscription_tier, subscription_id')
      .eq('email', customer.email)
      .single();

    if (profile?.id) {
      void sendPaymentFailedEmail(profile.id, customer.email);
    }

    const user = await resolveVpBillingUser(supabase, {
      userId: profile?.id,
      email: customer.email,
      customerId,
    });
    if (!user?.userId) return;

    const invoiceSubId =
      stripeInvoiceSubscriptionId(invoice) ||
      (typeof profile?.subscription_id === 'string' ? profile.subscription_id.trim() : '');
    let vpSubId: string | null = null;
    let plan = toVpPlanId(profile?.subscription_tier) || 'pro';
    if (invoiceSubId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(invoiceSubId);
        plan = toVpPlanId(resolveTierFromSubscription(stripeSub));
        await upsertVpSubscriptionFromStripe(supabase, {
          subscription: stripeSub,
          userId: user.userId,
          email: user.email || customer.email,
          fallbackTier: plan,
        });
        vpSubId = await findVpSubscriptionIdByStripeId(supabase, stripeSub.id);
        await supabase
          .schema('firstparty')
          .from('vp_subscriptions')
          .update({
            status: 'past_due',
            payment_retry_count: (stripeSub as { attempt_count?: number }).attempt_count ?? 1,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', stripeSub.id);
      } catch (err) {
        console.error('[vp-billing] invoice.payment_failed subscription sync failed:', err);
      }
    }

    await upsertVpInvoiceFromStripe(supabase, {
      invoice,
      userId: user.userId,
      email: user.email || customer.email,
      plan,
      vpSubscriptionId: vpSubId,
    });
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

  try {
    await processStripeEvent(event, supabase);
  } catch (err) {
    captureApiException(err);
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error(`Webhook ${event.type} failed:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

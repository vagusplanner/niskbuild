import 'server-only';

import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PAID_TIERS } from '@/lib/access';
import { getCloudCreditsForTier } from '@/lib/tier-config';
import { getPriceId } from '@/lib/stripe-price-ids';
import { reactivatePreviewsIfPaidAndActive } from '@/lib/preview-links';

const ALLOWED_TIERS = ['free', ...PAID_TIERS] as const;
export type AdminTierSlug = (typeof ALLOWED_TIERS)[number];

export function isAdminTierSlug(value: string): value is AdminTierSlug {
  return (ALLOWED_TIERS as readonly string[]).includes(value);
}

export type UpdateUserTierResult =
  | {
      ok: true;
      tier: AdminTierSlug;
      stripeSynced: boolean;
      stripeWarning?: string;
    }
  | { ok: false; error: string; status?: number };

async function syncStripeSubscription(
  subscriptionId: string,
  newTier: AdminTierSlug
): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return {
      ok: false,
      error:
        'User has an active Stripe subscription but STRIPE_SECRET_KEY is not configured. Tier was not changed.',
    };
  }

  const stripe = new Stripe(stripeKey);

  if (newTier === 'free') {
    await stripe.subscriptions.cancel(subscriptionId);
    return { ok: true };
  }

  const priceId = getPriceId(newTier, 'month');
  if (!priceId) {
    return {
      ok: false,
      error: `No Stripe monthly price is configured for tier "${newTier}". Tier was not changed.`,
    };
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) {
    return { ok: false, error: 'Stripe subscription has no line items to update.' };
  }

  await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'none',
  });

  return { ok: true };
}

/** Admin tier change — updates Supabase and syncs Stripe when subscription_id is set. */
export async function updateUserSubscriptionTier(
  userId: string,
  newTier: AdminTierSlug
): Promise<UpdateUserTierResult> {
  const admin = createAdminClient();

  const { data: profile, error: readError } = await admin
    .from('profiles')
    .select('id, email, subscription_tier, subscription_status, subscription_id')
    .eq('id', userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message, status: 500 };
  }
  if (!profile) {
    return { ok: false, error: 'User not found', status: 404 };
  }

  if (profile.subscription_tier === newTier && profile.subscription_status === 'active') {
    return { ok: true, tier: newTier, stripeSynced: false };
  }

  const subscriptionId =
    typeof profile.subscription_id === 'string' && profile.subscription_id.trim()
      ? profile.subscription_id.trim()
      : null;

  let stripeSynced = false;
  let stripeWarning: string | undefined;

  if (subscriptionId) {
    const stripeResult = await syncStripeSubscription(subscriptionId, newTier);
    if (!stripeResult.ok) {
      return { ok: false, error: stripeResult.error, status: 409 };
    }
    stripeSynced = true;
    if (stripeResult.warning) stripeWarning = stripeResult.warning;
  } else if (newTier !== 'free' && (PAID_TIERS as readonly string[]).includes(newTier)) {
    stripeWarning =
      'Profile updated without a Stripe subscription on file — grant is database-only until the user checks out.';
  }

  const row: Record<string, unknown> = {
    subscription_tier: newTier,
    subscription_status: 'active',
    cloud_credits_remaining: getCloudCreditsForTier(newTier),
    credit_alert_80_sent: false,
    credit_alert_100_sent: false,
  };

  if (newTier === 'free') {
    row.subscription_id = null;
    row.subscription_status = 'active';
  }

  const { error: updateError } = await admin.from('profiles').update(row).eq('id', userId);

  if (updateError) {
    return { ok: false, error: updateError.message, status: 500 };
  }

  await reactivatePreviewsIfPaidAndActive(userId, newTier, 'active');

  return { ok: true, tier: newTier, stripeSynced, stripeWarning };
}

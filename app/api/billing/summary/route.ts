import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { CLOUD_CREDITS_BY_TIER } from '@/lib/tier-config';
import { planDisplayName } from '@/lib/plan-display';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, cloud_credits_remaining, stripe_customer_id, subscription_id, credits_reset_at, reload_credits_expires_at'
    )
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';
  const allowance = CLOUD_CREDITS_BY_TIER[tier] ?? 0;
  const remaining = profile?.cloud_credits_remaining ?? 0;

  let nextBillingDate: string | null = profile?.credits_reset_at || null;
  let cancelAt: string | null = null;
  let isCancelled = false;

  if (profile?.subscription_id) {
    try {
      const sub = (await stripe.subscriptions.retrieve(
        profile.subscription_id
      )) as unknown as {
        current_period_end?: number;
        cancel_at_period_end?: boolean;
      };
      const periodEnd = sub.current_period_end;
      const cancelAtEnd = sub.cancel_at_period_end;
      if (periodEnd) {
        nextBillingDate = new Date(periodEnd * 1000).toISOString();
      }
      if (cancelAtEnd) {
        isCancelled = true;
        cancelAt = nextBillingDate;
      }
    } catch {
      // subscription may be stale
    }
  }

  const resetDate = nextBillingDate ? new Date(nextBillingDate) : null;
  const daysUntilReset = resetDate
    ? Math.max(0, Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return NextResponse.json({
    tier,
    tierLabel: planDisplayName(tier),
    status: profile?.subscription_status || 'inactive',
    creditsRemaining: remaining,
    creditsAllowance: allowance,
    creditsPercent: allowance > 0 ? Math.round((remaining / allowance) * 100) : 0,
    nextBillingDate,
    daysUntilReset,
    isCancelled,
    cancelAt,
    reloadCreditsExpiresAt: profile?.reload_credits_expires_at || null,
  });
}

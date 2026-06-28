import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  getCloudCreditsForTier,
  isPaidAndActive,
  isSandboxTier,
} from '@/lib/tier-config';

type CreditProfile = {
  cloud_credits_remaining: number | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  email: string | null;
  last_build_at?: string | null;
  builds_this_period?: number | null;
};

/** True when the user has never completed a tracked build. */
function neverBuilt(profile: {
  last_build_at?: string | null;
  builds_this_period?: number | null;
}): boolean {
  return !profile.last_build_at && (profile.builds_this_period ?? 0) === 0;
}

/**
 * Grant tier allowance when credits are still 0 but the user never built —
 * covers missed Stripe webhooks and new free-tier trial credits.
 */
export async function ensureCloudCreditsInitialized(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'cloud_credits_remaining, subscription_tier, subscription_status, last_build_at, builds_this_period'
    )
    .eq('id', userId)
    .single();

  if (!profile) return;

  const remaining = profile.cloud_credits_remaining ?? 0;
  if (remaining > 0) return;

  const tier = profile.subscription_tier ?? 'free';
  const allowance = getCloudCreditsForTier(tier);
  if (allowance <= 0) return;
  if (!neverBuilt(profile)) return;

  const paidActive = isPaidAndActive(tier, profile.subscription_status);
  const sandbox = isSandboxTier(tier);

  if (!paidActive && !sandbox) return;

  await supabase
    .from('profiles')
    .update({
      cloud_credits_remaining: allowance,
      credit_alert_80_sent: false,
      credit_alert_100_sent: false,
    })
    .eq('id', userId);
}

export async function loadCreditProfile(userId: string): Promise<CreditProfile | null> {
  const supabase = createAdminClient();
  await ensureCloudCreditsInitialized(userId);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'cloud_credits_remaining, subscription_tier, subscription_status, email, last_build_at, builds_this_period'
    )
    .eq('id', userId)
    .single();

  if (error || !profile) return null;
  return profile as CreditProfile;
}

export function canSpendCloudCredits(
  tier: string | null | undefined,
  status: string | null | undefined
): boolean {
  return isPaidAndActive(tier, status) || isSandboxTier(tier);
}

export function outOfCreditsMessage(
  tier: string | null | undefined,
  status: string | null | undefined
): string {
  if (isSandboxTier(tier)) {
    return 'Your free trial builds are used up. Upgrade to Pro for monthly cloud credits.';
  }
  if (!isPaidAndActive(tier, status)) {
    return 'Active paid subscription required for cloud generation. Choose a plan on Pricing.';
  }
  return 'Insufficient cloud credits. Upgrade or purchase a reload pack.';
}

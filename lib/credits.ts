import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { maybeSendUsageAlert } from '@/lib/usage-alerts';
import {
  canSpendCloudCredits,
  loadCreditProfile,
  outOfCreditsMessage,
} from '@/lib/credits-init';
import { isPaidAndActive } from '@/lib/tier-config';

export async function deductCloudCredit(
  userId: string | undefined
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  if (!userId) {
    return { ok: false, error: 'Unauthorized' };
  }

  const profile = await loadCreditProfile(userId);
  if (!profile) {
    return { ok: false, error: 'Profile not found' };
  }

  const tier = profile.subscription_tier;
  const status = profile.subscription_status;

  if (!canSpendCloudCredits(tier, status)) {
    return { ok: false, error: outOfCreditsMessage(tier, status) };
  }

  const remaining = profile.cloud_credits_remaining ?? 0;
  if (remaining <= 0) {
    if (isPaidAndActive(tier, status)) {
      maybeSendUsageAlert(userId, profile.email ?? undefined, tier ?? 'free', 0).catch(
        () => {}
      );
    }
    return { ok: false, error: outOfCreditsMessage(tier, status) };
  }

  const next = remaining - 1;
  const supabase = createAdminClient();
  await supabase
    .from('profiles')
    .update({ cloud_credits_remaining: next })
    .eq('id', userId);

  if (isPaidAndActive(tier, status)) {
    maybeSendUsageAlert(userId, profile.email ?? undefined, tier ?? 'free', next).catch(
      () => {}
    );
  }

  return { ok: true, remaining: next };
}

/** Deduct fractional cloud credits (e.g. 0.3 for visual edits). Uses credit_fraction_debt on profile. */
export async function deductCloudCredits(
  userId: string | undefined,
  amount: number
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  if (!userId) {
    return { ok: false, error: 'Unauthorized' };
  }
  if (amount <= 0) {
    return { ok: false, error: 'Invalid credit amount' };
  }

  const profile = await loadCreditProfile(userId);
  if (!profile) {
    return { ok: false, error: 'Profile not found' };
  }

  const tier = profile.subscription_tier;
  const status = profile.subscription_status;

  if (!isPaidAndActive(tier, status)) {
    return {
      ok: false,
      error: 'Active paid subscription required for cloud visual edits. Upgrade to Pro.',
    };
  }

  const supabase = createAdminClient();
  const { data: debtRow } = await supabase
    .from('profiles')
    .select('credit_fraction_debt')
    .eq('id', userId)
    .single();

  const remaining = profile.cloud_credits_remaining ?? 0;
  const debt = Number(debtRow?.credit_fraction_debt ?? 0);
  const nextDebt = debt + amount;
  const wholeCredits = Math.floor(nextDebt);
  const leftoverDebt = Math.round((nextDebt - wholeCredits) * 100) / 100;

  if (remaining < wholeCredits) {
    maybeSendUsageAlert(userId, profile.email ?? undefined, tier ?? 'free', remaining).catch(
      () => {}
    );
    return { ok: false, error: outOfCreditsMessage(tier, status) };
  }

  const nextRemaining = remaining - wholeCredits;

  await supabase
    .from('profiles')
    .update({
      cloud_credits_remaining: nextRemaining,
      credit_fraction_debt: leftoverDebt,
    })
    .eq('id', userId);

  maybeSendUsageAlert(userId, profile.email ?? undefined, tier ?? 'free', nextRemaining).catch(
    () => {}
  );

  return { ok: true, remaining: nextRemaining };
}

export async function addCloudCredits(
  userId: string,
  credits: number
): Promise<{ ok: boolean; remaining?: number }> {
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('cloud_credits_remaining')
    .eq('id', userId)
    .single();

  const current = profile?.cloud_credits_remaining ?? 0;
  const next = current + credits;

  await supabase
    .from('profiles')
    .update({ cloud_credits_remaining: next })
    .eq('id', userId);

  return { ok: true, remaining: next };
}

export { ensureCloudCreditsInitialized } from '@/lib/credits-init';

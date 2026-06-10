import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isPaidAndActive } from '@/lib/tier-config';
import { maybeSendUsageAlert } from '@/lib/usage-alerts';

export async function deductCloudCredit(
  userId: string | undefined
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  if (!userId) {
    return { ok: false, error: 'Unauthorized' };
  }

  const supabase = createAdminClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('cloud_credits_remaining, subscription_tier, subscription_status, email')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { ok: false, error: 'Profile not found' };
  }

  if (!isPaidAndActive(profile.subscription_tier, profile.subscription_status)) {
    return { ok: false, error: 'Active paid subscription required for cloud generation' };
  }

  const remaining = profile.cloud_credits_remaining ?? 0;
  if (remaining <= 0) {
    maybeSendUsageAlert(
      userId,
      profile.email ?? undefined,
      profile.subscription_tier,
      0
    ).catch(() => {});
    return { ok: false, error: 'Insufficient cloud credits. Upgrade or purchase a reload pack.' };
  }

  const next = remaining - 1;
  await supabase
    .from('profiles')
    .update({ cloud_credits_remaining: next })
    .eq('id', userId);

  maybeSendUsageAlert(userId, profile.email ?? undefined, profile.subscription_tier, next).catch(
    () => {}
  );

  return { ok: true, remaining: next };
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

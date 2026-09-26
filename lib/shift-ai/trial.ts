/**
 * App-level SuperEduc8 trial (14 days, no card).
 * Starts on self-signup or parental consent completion.
 */

import 'server-only';

import type { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export const SE8_TRIAL_DAYS = 14;

export function computeSe8TrialEndsAt(from: Date = new Date()): string {
  return new Date(from.getTime() + SE8_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Ensure a se8_subscriptions row exists with trial_ends_at set.
 * Does not shorten an existing future trial. Does not overwrite an active paid sub.
 */
export async function startSe8TrialForUser(
  admin: AdminClient,
  userId: string,
  opts?: { now?: Date }
): Promise<{ trialEndsAt: string }> {
  const now = opts?.now ?? new Date();
  const trialEndsAt = computeSe8TrialEndsAt(now);
  const nowIso = now.toISOString();

  const { data: existing } = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .select('id, status, trial_ends_at, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) {
    const status = (existing.status || '').toLowerCase();
    const paidish = status === 'active' || status === 'past_due';
    if (paidish && existing.stripe_subscription_id) {
      return {
        trialEndsAt: existing.trial_ends_at || trialEndsAt,
      };
    }

    const existingEnd = existing.trial_ends_at
      ? new Date(existing.trial_ends_at).getTime()
      : 0;
    const keepExisting = Number.isFinite(existingEnd) && existingEnd > now.getTime();
    const nextTrial = keepExisting ? existing.trial_ends_at! : trialEndsAt;

    const { error } = await admin
      .schema('firstparty')
      .from('se8_subscriptions')
      .update({
        trial_ends_at: nextTrial,
        // Keep paid status if somehow set; otherwise mark trialing when on free.
        ...(status === 'none' || status === 'canceled' || status === 'incomplete'
          ? { status: 'trialing', plan: 'trial' }
          : {}),
        updated_at: nowIso,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('[se8-trial] update failed:', error.message);
      throw new Error(`se8 trial update failed: ${error.message}`);
    }
    return { trialEndsAt: nextTrial };
  }

  const { error } = await admin
    .schema('firstparty')
    .from('se8_subscriptions')
    .insert({
      user_id: userId,
      status: 'trialing',
      plan: 'trial',
      child_quantity: 0,
      multi_curriculum: false,
      trial_ends_at: trialEndsAt,
      created_at: nowIso,
      updated_at: nowIso,
    });

  if (error) {
    console.error('[se8-trial] insert failed:', error.message);
    throw new Error(`se8 trial insert failed: ${error.message}`);
  }

  return { trialEndsAt };
}

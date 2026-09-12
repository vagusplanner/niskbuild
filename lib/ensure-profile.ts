/**
 * Ensure a public.profiles row exists for an auth user.
 * VP signup historically created auth.users only — Stripe webhooks and
 * billing-status resolve plans via profiles, so missing rows leave paid
 * users stuck on Free.
 */

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getCloudCreditsForTier } from '@/lib/tier-config';

export type EnsureProfileResult = {
  id: string;
  created: boolean;
  email: string;
};

export async function ensureProfileForUser(opts: {
  userId: string;
  email?: string | null;
  fullName?: string | null;
}): Promise<EnsureProfileResult | null> {
  const userId = opts.userId?.trim();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (existingError) {
    console.error('[ensure-profile] select failed:', existingError.message);
  }

  if (existing?.id) {
    // Backfill email if profile exists without one and we have a value.
    const email =
      (typeof opts.email === 'string' && opts.email.trim()) ||
      (typeof existing.email === 'string' && existing.email.trim()) ||
      '';
    if (!existing.email && opts.email?.trim()) {
      await admin
        .from('profiles')
        .update({ email: opts.email.trim() })
        .eq('id', userId);
    }
    return { id: existing.id, created: false, email };
  }

  let email =
    typeof opts.email === 'string' && opts.email.trim() ? opts.email.trim() : '';
  let fullName =
    typeof opts.fullName === 'string' && opts.fullName.trim()
      ? opts.fullName.trim()
      : null;

  if (!email || !fullName) {
    try {
      const { data: authData } = await admin.auth.admin.getUserById(userId);
      const authUser = authData?.user;
      if (!email && typeof authUser?.email === 'string') {
        email = authUser.email.trim();
      }
      if (!fullName) {
        const metaName = authUser?.user_metadata?.full_name;
        if (typeof metaName === 'string' && metaName.trim()) {
          fullName = metaName.trim();
        }
      }
    } catch (err) {
      console.error('[ensure-profile] auth lookup failed:', err);
    }
  }

  if (!email) {
    console.error('[ensure-profile] cannot create profile without email', { userId });
    return null;
  }

  const row: Record<string, unknown> = {
    id: userId,
    email,
    subscription_tier: 'free',
    subscription_status: 'inactive',
    cloud_credits_remaining: getCloudCreditsForTier('free'),
  };
  if (fullName) row.full_name = fullName;

  const { data: inserted, error: insertError } = await admin
    .from('profiles')
    .insert(row)
    .select('id, email')
    .maybeSingle();

  if (insertError) {
    // Race: another request created the row — treat as success.
    if (insertError.code === '23505') {
      const { data: raced } = await admin
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle();
      if (raced?.id) {
        return {
          id: raced.id,
          created: false,
          email: (typeof raced.email === 'string' && raced.email) || email,
        };
      }
    }
    console.error('[ensure-profile] insert failed:', insertError.message);
    return null;
  }

  if (!inserted?.id) {
    console.error('[ensure-profile] insert returned no row', { userId });
    return null;
  }

  return {
    id: inserted.id,
    created: true,
    email: (typeof inserted.email === 'string' && inserted.email) || email,
  };
}

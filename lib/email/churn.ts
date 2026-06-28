import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';
import { CHURN_INACTIVE_DAYS } from '@/lib/email/constants';

export type ChurnRiskUser = {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
  cloud_credits_remaining: number | null;
  created_at: string;
  last_build_at: string | null;
  daysSinceLastBuild: number;
};

function daysSince(iso: string | null, fallback: string): number {
  const ref = iso ? new Date(iso) : new Date(fallback);
  const ms = Date.now() - ref.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function isChurnCandidate(row: {
  subscription_tier: string | null;
  subscription_status: string | null;
  last_build_at: string | null;
  created_at: string;
}): boolean {
  if (!hasPaidTier(row.subscription_tier) || row.subscription_status !== 'active') {
    return false;
  }
  const inactiveDays = daysSince(row.last_build_at, row.created_at);
  return inactiveDays >= CHURN_INACTIVE_DAYS;
}

export async function fetchChurnRiskUsers(): Promise<ChurnRiskUser[]> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHURN_INACTIVE_DAYS);

  const { data, error } = await admin
    .from('profiles')
    .select(
      'id, email, subscription_tier, subscription_status, cloud_credits_remaining, created_at, last_build_at'
    )
    .eq('subscription_status', 'active')
    .not('subscription_tier', 'eq', 'free')
    .or(`last_build_at.is.null,last_build_at.lt.${cutoff.toISOString()}`)
    .order('last_build_at', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('fetchChurnRiskUsers:', error.message);
    return [];
  }

  return (data ?? [])
    .filter(isChurnCandidate)
    .map((row) => ({
      id: row.id as string,
      email: (row.email as string) || '—',
      subscription_tier: (row.subscription_tier as string) || 'free',
      subscription_status: (row.subscription_status as string) || 'inactive',
      cloud_credits_remaining: row.cloud_credits_remaining as number | null,
      created_at: row.created_at as string,
      last_build_at: row.last_build_at as string | null,
      daysSinceLastBuild: daysSince(
        row.last_build_at as string | null,
        row.created_at as string
      ),
    }));
}

export async function countChurnRiskUsers(): Promise<number> {
  const users = await fetchChurnRiskUsers();
  return users.length;
}

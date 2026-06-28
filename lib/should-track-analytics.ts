import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Server-side gate for usage_events inserts.
 * Default true (opt-out model) — only explicit false skips tracking.
 */
export async function shouldTrackAnalytics(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('analytics_opt_in')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('shouldTrackAnalytics lookup failed:', error.message);
    return true;
  }

  return data?.analytics_opt_in !== false;
}

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/** Canonical timestamp update when a user completes an AI build (local or cloud). */
export async function touchLastBuildAt(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('builds_this_period')
    .eq('id', userId)
    .single();

  const builds = (profile?.builds_this_period ?? 0) + 1;
  const now = new Date().toISOString();

  const { error } = await admin
    .from('profiles')
    .update({ last_build_at: now, builds_this_period: builds })
    .eq('id', userId);

  if (error) {
    console.error('touchLastBuildAt:', error.message);
  }
}

export async function resetBuildsThisPeriod(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('profiles').update({ builds_this_period: 0 }).eq('id', userId);
}

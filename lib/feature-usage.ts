import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type PlatformFeatureKey =
  | 'byoc'
  | 'games'
  | 'pwa'
  | 'seo_panel'
  | 'google_places'
  | 'social_publisher';

export async function logFeatureUsage(
  userId: string,
  featureKey: PlatformFeatureKey
): Promise<void> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('feature_usage')
    .select('id')
    .eq('user_id', userId)
    .eq('feature_key', featureKey)
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from('feature_usage').insert({
    user_id: userId,
    feature_key: featureKey,
  });

  if (error) {
    console.error('logFeatureUsage:', error.message);
  }
}

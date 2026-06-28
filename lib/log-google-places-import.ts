import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logFeatureUsage } from '@/lib/feature-usage';

export async function logGooglePlacesImport(params: {
  userId: string;
  sessionId: string;
  subscriptionTier: string;
  businessName?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const anonymousId = createHash('sha256')
    .update(`${params.userId}-${params.sessionId}`)
    .digest('hex')
    .substring(0, 32);

  const { error } = await supabase.from('metadata_logs').insert({
    anonymous_id: anonymousId,
    app_category: 'import',
    features_list: ['google_places', params.businessName || 'business'].filter(Boolean),
    prompts_count: 1,
    success_count: 1,
    fail_count: 0,
    build_duration: 0,
    exported_locally: false,
    subscription_tier: params.subscriptionTier,
    region: 'Other',
    import_type: 'google_places',
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Google Places import metadata log error:', error.message);
  }

  void logFeatureUsage(params.userId, 'google_places');
}

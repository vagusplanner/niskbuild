import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function logPwaExport(params: {
  userId: string;
  sessionId: string;
  subscriptionTier: string;
  appCategory?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const anonymousId = createHash('sha256')
    .update(`${params.userId}-${params.sessionId}`)
    .digest('hex')
    .substring(0, 32);

  const { error } = await supabase.from('metadata_logs').insert({
    anonymous_id: anonymousId,
    app_category: params.appCategory || 'pwa',
    features_list: ['pwa', 'export'],
    prompts_count: 0,
    success_count: 1,
    fail_count: 0,
    build_duration: 0,
    exported_locally: true,
    subscription_tier: params.subscriptionTier,
    region: 'Other',
    export_type: 'pwa',
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('PWA export metadata log error:', error.message);
  }
}

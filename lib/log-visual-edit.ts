import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { VISUAL_EDIT_CREDIT_COST } from '@/lib/visual-editor-types';

export async function logVisualEdit(params: {
  userId: string;
  sessionId: string;
  subscriptionTier: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const anonymousId = createHash('sha256')
    .update(`${params.userId}-${params.sessionId}`)
    .digest('hex')
    .substring(0, 32);

  const { error } = await supabase.from('metadata_logs').insert({
    anonymous_id: anonymousId,
    app_category: 'builder',
    features_list: ['visual_edit'],
    prompts_count: 1,
    success_count: 1,
    fail_count: 0,
    build_duration: 0,
    exported_locally: false,
    subscription_tier: params.subscriptionTier,
    region: 'Other',
    prompt_type: 'visual_edit',
    credits_used: VISUAL_EDIT_CREDIT_COST,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Visual edit metadata log error:', error.message);
  }
}

import 'server-only';

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { STRIPE_INJECT_CREDIT_COST } from '@/lib/integrations-config';

export async function logStripeIntegration(params: {
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
    app_category: 'integration',
    features_list: ['stripe'],
    prompts_count: 1,
    success_count: 1,
    fail_count: 0,
    build_duration: 0,
    exported_locally: false,
    subscription_tier: params.subscriptionTier,
    region: 'Other',
    integration_type: 'stripe',
    credits_used: STRIPE_INJECT_CREDIT_COST,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Stripe integration metadata log error:', error.message);
  }
}

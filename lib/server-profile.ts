import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, cloud_credits_remaining, stripe_customer_id, email'
    )
    .eq('id', user.id)
    .single();

  return { supabase, user, profile };
}

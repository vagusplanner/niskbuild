import { NextRequest, NextResponse } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCloudCreditsForTier, isPaidAndActive } from '@/lib/tier-config';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const user = guard.user!;
    const supabase = createAdminClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, cloud_credits_remaining, purchased_templates')
      .eq('id', user.id)
      .single();

    if (error) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          subscription_tier: 'free',
          subscription_status: 'inactive',
          cloud_credits_remaining: 0,
        })
        .select('subscription_tier, subscription_status, cloud_credits_remaining')
        .single();

      if (insertError) {
        return NextResponse.json(
          { active: false, tier: 'free', status: 'inactive', paid: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        active: false,
        paid: false,
        tier: newProfile?.subscription_tier || 'free',
        status: newProfile?.subscription_status || 'inactive',
        credits: 0,
        creditsAllowance: 0,
      });
    }

    const tier = profile?.subscription_tier || 'free';
    const status = profile?.subscription_status || 'inactive';
    const paidActive = isPaidAndActive(tier, status);

    return NextResponse.json({
      active: paidActive,
      paid: paidActive,
      tier,
      status,
      credits: profile?.cloud_credits_remaining ?? 0,
      creditsAllowance: getCloudCreditsForTier(tier),
      purchasedTemplates: Array.isArray(profile?.purchased_templates)
        ? profile.purchased_templates
        : [],
    });
  } catch (error) {
    captureApiException(error);
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { active: false, tier: 'free', status: 'inactive', paid: false },
      { status: 500 }
    );
  }
}

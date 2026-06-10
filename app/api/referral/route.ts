import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Get user's referral info
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, referral_rewards')
      .eq('id', guard.user!.id)
      .single();
    
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
  }
}

// Create referral record when someone signs up with code
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { referrerCode, referredEmail } = await request.json();
    const referredUserId = guard.user!.id;
    const supabase = createAdminClient();

    const { data: referrer } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referrerCode)
      .single();
    
    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }
    
    // Create referral record
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_email: referredEmail,
        referred_user_id: referredUserId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select();
    
    if (error) throw error;
    
    // Update referrer's count and give reward (1 free month after 3 referrals)
    await supabase.rpc('increment_referral_count', { user_id: referrer.id });
    
    return NextResponse.json({ success: true, referral: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Get user's referral info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, referral_rewards')
      .eq('id', userId)
      .single();
    
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
  }
}

// Create referral record when someone signs up with code
export async function POST(request: NextRequest) {
  try {
    const { referrerCode, referredEmail, referredUserId } = await request.json();
    
    // Find referrer by code
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
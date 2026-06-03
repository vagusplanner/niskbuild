import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  console.log('📡 [API] Subscription status request received');
  
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.log('📡 [API] No auth header, returning default (free)');
      return NextResponse.json({ active: true, tier: 'free', status: 'active' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the session
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('📡 [API] No valid user, returning default (free)');
      return NextResponse.json({ active: true, tier: 'free', status: 'active' });
    }

    console.log(`📡 [API] User found: ${user.email} (ID: ${user.id})`);

    // Get subscription status from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (error) {
      console.log(`📡 [API] Error fetching profile:`, error.message);
      
      // Profile doesn't exist - create one
      console.log(`📡 [API] Creating new profile for ${user.email}...`);
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          subscription_tier: 'free',
          subscription_status: 'active',
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('📡 [API] Failed to create profile:', insertError);
        return NextResponse.json({ active: true, tier: 'free', status: 'active' });
      }
      
      console.log('📡 [API] Created new profile:', newProfile);
      return NextResponse.json({
        active: true,
        tier: 'free',
        status: 'active',
      });
    }

    // Log what we found
    console.log(`📡 [API] Profile found - Tier: ${profile?.subscription_tier}, Status: ${profile?.subscription_status}`);

    // Determine if subscription is active
    const isActive = 
      profile?.subscription_status === 'active' ||
      profile?.subscription_tier === 'pro' ||
      profile?.subscription_tier === 'agency' ||
      profile?.subscription_tier === 'scale' ||
      profile?.subscription_tier === 'white_label';

    const tier = profile?.subscription_tier || 'free';
    
    console.log(`📡 [API] Returning - Active: ${isActive}, Tier: ${tier}`);

    return NextResponse.json({
      active: isActive,
      tier: tier,
      status: profile?.subscription_status || 'active',
    });
    
  } catch (error) {
    console.error('❌ [API] Subscription status error:', error);
    // Return free as default to prevent locking users out
    return NextResponse.json({ active: true, tier: 'free', status: 'active' });
  }
}
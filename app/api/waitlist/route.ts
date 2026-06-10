import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 10 });
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { email, source } = body;

    console.log('📧 Waitlist signup request for:', email);

    // Validate email
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email:', email);
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Call the Supabase RPC function that bypasses RLS
    const { data, error } = await supabase
      .rpc('add_to_waitlist', { 
        email_text: email.toLowerCase().trim(), 
        source_text: source || 'landing' 
      });

    console.log('📊 RPC Response:', { data, error });

    if (error) {
      console.error('❌ RPC Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to join waitlist' },
        { status: 500 }
      );
    }

    // Check if email was duplicate (function returns { duplicate: true })
    if (data && data.duplicate === true) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist!' },
        { status: 409 }
      );
    }

    // Get updated count
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    console.log('✅ Insert successful! New count:', count);

    return NextResponse.json({ 
      success: true, 
      message: 'Added to waitlist!',
      count: count || 0
    });
    
  } catch (error) {
    console.error('💥 Waitlist error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + String(error) },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/pricing';
  const authError = requestUrl.searchParams.get('error');

  if (authError) {
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', requestUrl.origin)
    );
  }

  let userId: string | null = null;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(
        new URL('/login?error=auth_failed', requestUrl.origin)
      );
    }

    userId = data.user?.id ?? null;
  }

  if (userId) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status, phone_verified')
      .eq('id', userId)
      .single();

    const paid =
      hasPaidTier(profile?.subscription_tier) &&
      profile?.subscription_status === 'active';

    if (!paid && !profile?.phone_verified) {
      return NextResponse.redirect(new URL('/verify-phone', requestUrl.origin));
    }
  }

  const destination = new URL(next, requestUrl.origin);
  if (next === '/builder' || next.startsWith('/builder')) {
    destination.searchParams.set('welcome', '1');
  }

  return NextResponse.redirect(destination);
}

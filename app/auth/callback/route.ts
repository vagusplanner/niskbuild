import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePostAuthPath } from '@/lib/post-auth-redirect';
import { recordSignupIfNewUser } from '@/lib/usage-events';
import { sendWelcomeEmail } from '@/lib/email/lifecycle';
import { clientIpFromHeaders } from '@/lib/coarse-town';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
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
    const isPasswordRecovery = next === '/reset-password';
    if (userId && data.user?.email && !isPasswordRecovery) {
      void recordSignupIfNewUser(userId, {
        clientIp: clientIpFromHeaders(new Headers(request.headers)),
      });
      void sendWelcomeEmail(userId, data.user.email);
    }
  }

  if (userId) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status, phone_verified')
      .eq('id', userId)
      .single();

    const destinationPath = resolvePostAuthPath(profile ?? {}, next);
    const destination = new URL(destinationPath, requestUrl.origin);
    if (
      destinationPath.startsWith('/builder') ||
      (next && next.startsWith('/builder'))
    ) {
      destination.searchParams.set('welcome', '1');
    }
    return NextResponse.redirect(destination);
  }

  const fallback = new URL(resolvePostAuthPath({}, next), requestUrl.origin);
  return NextResponse.redirect(fallback);
}

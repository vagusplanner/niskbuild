import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(
        new URL('/login?error=auth_failed', requestUrl.origin)
      );
    }
  }

  const destination = new URL(next, requestUrl.origin);
  if (next === '/builder' || next.startsWith('/builder')) {
    destination.searchParams.set('welcome', '1');
  }

  return NextResponse.redirect(destination);
}

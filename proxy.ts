import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  hasPaidTier,
  isAuthOnlyPath,
  isPaidPath,
  isPhoneVerifyExemptPath,
  isPreviewPath,
  isPublicPath,
} from '@/lib/access';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // preview.niskbuild.com/abc123 → /preview/abc123
  if (host.startsWith('preview.') && pathname.length > 1 && !pathname.startsWith('/preview/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/preview${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Always allow API routes and static assets
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (isPublicPath(pathname) || isPreviewPath(pathname)) {
    return supabaseResponse;
  }

  // Not signed in → login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, phone_verified')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier ?? 'free';
  const paid = hasPaidTier(tier) && profile?.subscription_status === 'active';

  if (!paid && !profile?.phone_verified && !isPhoneVerifyExemptPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/verify-phone';
    return NextResponse.redirect(url);
  }

  if (isPaidPath(pathname) || isAuthOnlyPath(pathname)) {
    if (isPaidPath(pathname) && !paid) {
      const url = request.nextUrl.clone();
      url.pathname = '/pricing';
      url.searchParams.set('upgrade', '1');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

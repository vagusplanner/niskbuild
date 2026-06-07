import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  hasPaidTier,
  isAuthOnlyPath,
  isPaidPath,
  isPublicPath,
} from '@/lib/access';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow API routes and static assets
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Not signed in → login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Signed in — check subscription for paid routes
  if (isPaidPath(pathname) || isAuthOnlyPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier ?? 'free';
    const paid = hasPaidTier(tier) && profile?.subscription_status === 'active';

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

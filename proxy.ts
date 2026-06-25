import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  hasPaidTier,
  isAuthOnlyPath,
  isPaidPath,
  isPhoneVerifyExemptPath,
  isPlatformOwnerPath,
  isPreviewPath,
  isPublicPath,
  isTenantRuntimePath,
} from '@/lib/access';
import {
  isBasePlatform,
  resolveTenantByHostname,
  shouldSkipTenantRouting,
} from '@/lib/tenant-routing';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // preview.niskbuild.com/abc123 → /preview/abc123
  if (host.startsWith('preview.') && pathname.length > 1 && !pathname.startsWith('/preview/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/preview${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Multi-tenant: white-label subdomain or custom domain → compiled app runtime
  if (!isBasePlatform(host) && !shouldSkipTenantRouting(pathname)) {
    const tenant = await resolveTenantByHostname(host);

    if (tenant) {
      if (tenant.status === 'suspended') {
        const url = request.nextUrl.clone();
        url.pathname = '/system/nodes-offline';
        return NextResponse.rewrite(url);
      }

      if (tenant.status === 'active') {
        const appType = tenant.app_type || 'webapp';
        const url = request.nextUrl.clone();
        // SPA runtimes handle client-side routes inside the iframe/bundle
        url.pathname = `/app-runtime-engines/${appType}/${tenant.id}`;
        const response = NextResponse.rewrite(url);
        response.headers.set('x-tenant-app-id', tenant.id);
        return response;
      }
    }
  }

  // Always allow API routes and static assets on base platform
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (isPublicPath(pathname) || isPreviewPath(pathname) || isTenantRuntimePath(pathname)) {
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

  // Platform-owner routes (3-layer admin + VP studio) — no paid tier required
  if (isPlatformOwnerPath(pathname)) {
    const { data: isOwner } = await supabase.rpc('is_platform_owner').single();
    if (!isOwner) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'admin_required');
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

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
    '/((?!api/auth|_next/static|_next/image|assets|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

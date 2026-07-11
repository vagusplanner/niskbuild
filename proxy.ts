import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  hasPaidTier,
  isAuthExemptPath,
  isAuthOnlyPath,
  isPaidPath,
  isPhoneVerifyExemptPath,
  isPlatformOwnerPath,
  isStaticPublicAsset,
  isVpDeployBundlePath,
} from '@/lib/access';
import {
  isBasePlatform,
  resolveTenantByHostname,
  shouldSkipTenantRouting,
} from '@/lib/tenant-routing';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const canonical = (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
    'https://www.niskbuild.com'
  );

  // Never 308 API/webhooks off the production Vercel alias — Resend/Stripe POST
  // clients often do not re-POST after redirects (endpoint gets disabled).
  const isApiOrAsset =
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    isVpDeployBundlePath(pathname) ||
    isStaticPublicAsset(pathname);

  if (hostname === 'niskbuild.vercel.app' && !isApiOrAsset) {
    const url = new URL(pathname + request.nextUrl.search, canonical);
    return NextResponse.redirect(url, 308);
  }

  // Apex custom domain: send browsers to www, but keep /api on apex so webhook
  // providers that still target https://niskbuild.com/... get 2xx (Vercel
  // platform redirect to www was cleared for this reason).
  if (hostname === 'niskbuild.com' && !isApiOrAsset) {
    const url = new URL(pathname + request.nextUrl.search, canonical);
    return NextResponse.redirect(url, 308);
  }

  // preview.niskbuild.com/abc123 → /preview/abc123
  // /vp-deploy/... must not be rewritten (bundle assets live on preview host).
  if (
    host.startsWith('preview.') &&
    pathname.length > 1 &&
    !pathname.startsWith('/preview/') &&
    !pathname.startsWith('/vp-deploy/')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/preview${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Custom-domain PWA manifest → branded dynamic manifest
  if (
    !isBasePlatform(host) &&
    (pathname === '/site.webmanifest' || pathname === '/manifest.webmanifest')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/tenant-manifest';
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

  // Always allow API routes, static assets, and public VP deploy bundles (no auth).
  if (isApiOrAsset) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  if (isAuthExemptPath(pathname)) {
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
    const checkoutSuccess =
      pathname === '/dashboard' && request.nextUrl.searchParams.get('success') === 'true';
    if (!checkoutSuccess) {
      const url = request.nextUrl.clone();
      url.pathname = '/verify-phone';
      return NextResponse.redirect(url);
    }
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
    '/((?!api/auth|_next/static|_next/image|assets|favicon.ico|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico|json|txt|xml|woff2?)$).*)',
  ],
};

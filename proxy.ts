import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  SHIFT_AI_LANG_HEADER,
  isUnauthenticatedLocaleOverridePath,
  parseLangQueryParam,
} from '@/lib/shift-ai/locale-query';
import {
  hasPaidTier,
  isAuthExemptPath,
  isAuthOnlyPath,
  isPaidPath,
  isPhoneVerifyExemptPath,
  isPlatformOwnerPath,
  isShiftAiUnauthenticatedPath,
  isStaticPublicAsset,
  isVpDeployBundlePath,
} from '@/lib/access';
import {
  isBasePlatform,
  resolveTenantByHostname,
  shouldSkipTenantRouting,
} from '@/lib/tenant-routing';
import {
  isSuperEduc8Host,
  isSuperEduc8PassthroughPath,
  mapSuperEduc8PathToInternal,
  shiftAiPublicPathname,
  SHIFT_AI_INTERNAL_PREFIX,
} from '@/lib/supereduc8-host';

function requestWithShiftAiLangHeader(request: NextRequest): NextRequest {
  const lang = parseLangQueryParam(request.nextUrl.searchParams.get('lang'));
  const pathForLocale = isSuperEduc8Host(
    (request.headers.get('host') || '').split(':')[0].toLowerCase()
  )
    ? mapSuperEduc8PathToInternal(request.nextUrl.pathname)
    : request.nextUrl.pathname;
  if (!lang || !isUnauthenticatedLocaleOverridePath(pathForLocale)) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set(SHIFT_AI_LANG_HEADER, lang);
  return new NextRequest(request, { headers });
}

export async function proxy(request: NextRequest) {
  request = requestWithShiftAiLangHeader(request);
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const canonical = (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
    'https://www.niskbuild.com'
  );
  const superEduc8Host = isSuperEduc8Host(hostname);

  // Shared deployment: public/favicon.ico is NiskBuild's. On SuperEduc8 hosts,
  // rewrite default icon paths to the SuperEduc8 brand assets so browsers that
  // request /favicon.ico directly (or via Next file-convention leftovers) do
  // not show the NiskBuild copper mark.
  if (superEduc8Host) {
    const seIconRewrites: Record<string, string> = {
      '/favicon.ico': '/brand/supereduc8/favicon.ico',
      '/apple-touch-icon.png': '/brand/supereduc8/apple-touch-icon.png',
      '/apple-touch-icon': '/brand/supereduc8/apple-touch-icon.png',
    };
    const iconTarget = seIconRewrites[pathname];
    if (iconTarget) {
      const url = request.nextUrl.clone();
      url.pathname = iconTarget;
      return NextResponse.rewrite(url);
    }
  }

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

  // SuperEduc8 apex → www (same pattern as NiskBuild; keep /api on apex).
  if (hostname === 'supereduc8.com' && !isApiOrAsset) {
    const url = new URL(
      pathname + request.nextUrl.search,
      process.env.NEXT_PUBLIC_SUPEREDUC8_URL?.trim().replace(/\/$/, '') ||
        'https://www.supereduc8.com'
    );
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

  // Custom-domain PWA manifest → branded dynamic manifest (before auth).
  // Matcher must include site.webmanifest so this rewrite can run; base
  // platform keeps the static public/site.webmanifest via next() below.
  // SuperEduc8 is a first-party product host — not a tenant custom domain.
  if (
    !isBasePlatform(hostname) &&
    !superEduc8Host &&
    (pathname === '/site.webmanifest' ||
      pathname === '/manifest.webmanifest' ||
      pathname === '/tenant-manifest')
  ) {
    if (pathname === '/tenant-manifest') {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/tenant-manifest';
    return NextResponse.rewrite(url);
  }

  // Multi-tenant: white-label subdomain or custom domain → compiled app runtime
  // Skip for SuperEduc8 — same deployment, host-based product rewrite below.
  if (!isBasePlatform(hostname) && !superEduc8Host && !shouldSkipTenantRouting(pathname)) {
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

  // ── SuperEduc8 host: clean public URLs → /builder/shift-ai/* ─────────────
  // Same Vercel project as NiskBuild; no separate deployment required.
  if (superEduc8Host) {
    // Pages/clients that still emit internal hrefs get normalized to clean URLs.
    if (
      pathname === SHIFT_AI_INTERNAL_PREFIX ||
      pathname.startsWith(`${SHIFT_AI_INTERNAL_PREFIX}/`)
    ) {
      const clean = shiftAiPublicPathname(pathname);
      const url = request.nextUrl.clone();
      url.pathname = clean === '/' ? '/' : clean;
      return NextResponse.redirect(url, 308);
    }

    if (isSuperEduc8PassthroughPath(pathname)) {
      // Shared auth/API/static — fall through to normal NiskBuild auth below.
    } else {
      const internalPath = mapSuperEduc8PathToInternal(pathname);
      const { supabase, supabaseResponse, user } = await updateSession(request);

      if (isAuthExemptPath(internalPath) || isShiftAiUnauthenticatedPath(internalPath)) {
        const url = request.nextUrl.clone();
        url.pathname = internalPath;
        return NextResponse.rewrite(url, { headers: supabaseResponse.headers });
      }

      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('next', pathname === '/' ? '/dashboard' : pathname);
        return NextResponse.redirect(url);
      }

      // Platform owners skip phone / tier gates (same as NiskBuild).
      const { data: isOwner } = await supabase.rpc('is_platform_owner').single();
      if (isOwner) {
        const url = request.nextUrl.clone();
        url.pathname = internalPath;
        return NextResponse.rewrite(url, { headers: supabaseResponse.headers });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, phone_verified')
        .eq('id', user.id)
        .single();

      const tier = profile?.subscription_tier ?? 'free';
      const paid = hasPaidTier(tier) && profile?.subscription_status === 'active';

      if (!paid && !profile?.phone_verified && !isPhoneVerifyExemptPath(internalPath)) {
        const url = request.nextUrl.clone();
        url.pathname = '/verify-phone';
        return NextResponse.redirect(url);
      }

      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      return NextResponse.rewrite(url, { headers: supabaseResponse.headers });
    }
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

  const { data: isOwner } = await supabase.rpc('is_platform_owner').single();
  if (isOwner) {
    return supabaseResponse;
  }

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
    // Include site.webmanifest so custom domains can rewrite to /tenant-manifest.
    // Static NiskBuild manifest still served on base platform via next().
    '/((?!api/auth|_next/static|_next/image|assets|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|xml|woff2?|wasm)$).*)',
  ],
};

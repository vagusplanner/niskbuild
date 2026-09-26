import { hasPaidTier, isPublicPath } from '@/lib/access';
import { getSuperEduc8Origin, isSuperEduc8Host } from '@/lib/supereduc8-host';

export type PostAuthProfile = {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  phone_verified?: boolean | null;
};

export type PostAuthProduct = 'niskbuild' | 'supereduc8';

/** Safe internal path only — blocks open redirects. */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Infer product from a request host or absolute origin (auth callback / redirects). */
export function resolvePostAuthProduct(
  hostOrOrigin: string | null | undefined
): PostAuthProduct {
  if (!hostOrOrigin) return 'niskbuild';
  try {
    const host = hostOrOrigin.includes('://')
      ? new URL(hostOrOrigin).hostname
      : hostOrOrigin.split(':')[0];
    return isSuperEduc8Host(host) ? 'supereduc8' : 'niskbuild';
  } catch {
    return 'niskbuild';
  }
}

/**
 * Explicit product query (?product=supereduc8) wins over host — needed when
 * Supabase OAuth falls back to the NiskBuild Site URL but the login started on SE8.
 */
export function resolvePostAuthProductFromRequest(opts: {
  hostOrOrigin?: string | null;
  productParam?: string | null;
}): PostAuthProduct {
  if (opts.productParam === 'supereduc8') return 'supereduc8';
  if (opts.productParam === 'niskbuild') return 'niskbuild';
  return resolvePostAuthProduct(opts.hostOrOrigin);
}

/** NiskBuild funnel paths that must never be post-auth destinations on SuperEduc8. */
const SE8_FORBIDDEN_NEXT_PREFIXES = [
  '/pricing',
  '/verify-phone',
  '/builder?welcome',
  '/landing',
  '/landing-v2',
] as const;

/**
 * Normalize a requested next path for SuperEduc8: drop NiskBuild billing/phone
 * funnels and map internal /builder/shift-ai/* onto clean public paths.
 */
export function sanitizeSuperEduc8NextPath(
  requestedNext?: string | null
): string {
  const raw = sanitizeNextPath(requestedNext);
  if (!raw) return '/dashboard';

  const pathOnly = raw.split('?')[0];

  if (
    SE8_FORBIDDEN_NEXT_PREFIXES.some(
      (p) => pathOnly === p || pathOnly.startsWith(`${p}/`) || raw.startsWith(p)
    )
  ) {
    return '/dashboard';
  }

  // Internal Shift routes → clean SuperEduc8 URLs
  if (pathOnly === '/builder/shift-ai' || pathOnly === '/builder/shift-ai/') {
    return '/dashboard';
  }
  if (pathOnly.startsWith('/builder/shift-ai/')) {
    const rest = pathOnly.slice('/builder/shift-ai'.length) || '/dashboard';
    return rest === '/' ? '/dashboard' : rest;
  }

  if (isPublicPath(pathOnly)) {
    // After auth, don't dump users back onto marketing/auth shells.
    if (
      pathOnly === '/' ||
      pathOnly === '/privacy' ||
      pathOnly === '/terms' ||
      pathOnly === '/signup' ||
      pathOnly === '/login' ||
      pathOnly === '/pricing'
    ) {
      return '/dashboard';
    }
  }

  return raw;
}

/**
 * After sign-in/sign-up:
 * - SuperEduc8: never require NiskBuild Sandbox phone verify; never funnel to
 *   NiskBuild /pricing. Age/parental consent is handled by SE8 signup flows.
 * - NiskBuild: phone verify if unpaid and not verified, else pricing or next.
 */
export function resolvePostAuthPath(
  profile: PostAuthProfile,
  requestedNext?: string | null,
  options?: { isPlatformOwner?: boolean; product?: PostAuthProduct }
): string {
  const product = options?.product ?? 'niskbuild';
  const safeNext = sanitizeNextPath(requestedNext);

  if (safeNext?.startsWith('/reset-password')) {
    return safeNext;
  }

  if (product === 'supereduc8') {
    // Platform-owner and regular SE8 users share the same rule: stay on SE8 app
    // routes. Owner bypass must NOT fall through to NiskBuild pricing logic.
    return sanitizeSuperEduc8NextPath(safeNext);
  }

  const paid =
    hasPaidTier(profile.subscription_tier ?? undefined) &&
    profile.subscription_status === 'active';

  if (options?.isPlatformOwner) {
    if (
      safeNext &&
      !safeNext.startsWith('/verify-phone') &&
      !isPublicPath(safeNext.split('?')[0])
    ) {
      return safeNext;
    }
    return '/dashboard';
  }

  if (!paid && !profile.phone_verified) {
    if (safeNext?.startsWith('/verify-phone')) return safeNext;
    return '/verify-phone';
  }

  if (!paid) {
    if (
      safeNext &&
      (safeNext.startsWith('/pricing') ||
        safeNext.startsWith('/login') ||
        isPublicPath(safeNext.split('?')[0]))
    ) {
      return safeNext;
    }
    return '/pricing?welcome=1';
  }

  if (safeNext && !isPublicPath(safeNext.split('?')[0])) {
    return safeNext;
  }

  return '/dashboard';
}

/**
 * Absolute URL for the post-auth redirect. When the auth callback ran on
 * NiskBuild (OAuth Site URL) but the login was for SuperEduc8, bounce to the
 * SE8 origin so users never see NiskBuild pricing/dashboard.
 */
export function resolvePostAuthRedirectUrl(opts: {
  destinationPath: string;
  callbackOrigin: string;
  product: PostAuthProduct;
}): string {
  const path = opts.destinationPath.startsWith('/')
    ? opts.destinationPath
    : `/${opts.destinationPath}`;

  if (opts.product === 'supereduc8') {
    try {
      const host = new URL(opts.callbackOrigin).hostname;
      if (!isSuperEduc8Host(host)) {
        return `${getSuperEduc8Origin()}${path}`;
      }
    } catch {
      return `${getSuperEduc8Origin()}${path}`;
    }
  }

  return new URL(path, opts.callbackOrigin).toString();
}

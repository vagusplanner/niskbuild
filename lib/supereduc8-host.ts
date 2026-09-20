/**
 * SuperEduc8 branded host helpers.
 *
 * Product UI still lives under internal routes `/builder/shift-ai/*`.
 * On supereduc8.com the edge proxy rewrites clean public paths → those internals.
 */

export const SHIFT_AI_INTERNAL_PREFIX = '/builder/shift-ai';

export const SUPEREDUC8_DEFAULT_ORIGIN = 'https://www.supereduc8.com';

/** Hosts that serve the SuperEduc8 product at the site root. */
export function isSuperEduc8Host(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  if (!host) return false;
  return (
    host === 'supereduc8.com' ||
    host === 'www.supereduc8.com' ||
    host.endsWith('.supereduc8.com')
  );
}

/** Canonical public origin for emails / absolute links. */
export function getSuperEduc8Origin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SUPEREDUC8_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return SUPEREDUC8_DEFAULT_ORIGIN;
}

/** Canonical SuperEduc8 privacy policy URL (host-aware /privacy page). */
export function getSuperEduc8PrivacyUrl(): string {
  return `${getSuperEduc8Origin()}/privacy`;
}

/**
 * Paths that stay un-prefixed on SuperEduc8 (shared NiskBuild auth + platform).
 * Everything else maps under /builder/shift-ai.
 */
export function isSuperEduc8PassthroughPath(pathname: string): boolean {
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/auth')) return true;
  if (pathname.startsWith('/monitoring')) return true;
  // Marketing root — SuperEduc8 landing (host-aware app/page.tsx).
  if (pathname === '/' || pathname === '') return true;
  if (pathname === '/login' || pathname.startsWith('/login/')) return true;
  if (pathname === '/reset-password' || pathname.startsWith('/reset-password/')) return true;
  if (pathname === '/verify-phone' || pathname.startsWith('/verify-phone/')) return true;
  // Shared legal pages — privacy is host-aware; terms currently NiskBuild until SE8 terms exist.
  if (pathname === '/privacy' || pathname.startsWith('/privacy/')) return true;
  if (pathname === '/terms' || pathname.startsWith('/terms/')) return true;
  return false;
}

/**
 * Browser path on SuperEduc8 → internal Shift route.
 * Note: `/` is a passthrough marketing landing (not rewritten here).
 */
export function mapSuperEduc8PathToInternal(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/') return SHIFT_AI_INTERNAL_PREFIX;
  if (
    normalized === SHIFT_AI_INTERNAL_PREFIX ||
    normalized.startsWith(`${SHIFT_AI_INTERNAL_PREFIX}/`)
  ) {
    return normalized;
  }
  return `${SHIFT_AI_INTERNAL_PREFIX}${normalized}`;
}

/**
 * Build an in-app href. On SuperEduc8 hosts use clean public paths;
 * on NiskBuild keep `/builder/shift-ai/...`.
 *
 * @param subpath e.g. `/dashboard`, `/flashcards`, `/`
 */
export function shiftAiAppPath(subpath: string, hostname?: string): string {
  const clean = !subpath || subpath === '/' ? '/' : subpath.startsWith('/') ? subpath : `/${subpath}`;
  const host =
    hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '');

  if (host && isSuperEduc8Host(host)) {
    return clean;
  }

  if (clean === '/') return SHIFT_AI_INTERNAL_PREFIX;
  return `${SHIFT_AI_INTERNAL_PREFIX}${clean}`;
}

/** Strip internal prefix for comparisons when needed. */
export function shiftAiPublicPathname(pathname: string): string {
  if (pathname === SHIFT_AI_INTERNAL_PREFIX) return '/';
  if (pathname.startsWith(`${SHIFT_AI_INTERNAL_PREFIX}/`)) {
    return pathname.slice(SHIFT_AI_INTERNAL_PREFIX.length) || '/';
  }
  return pathname;
}

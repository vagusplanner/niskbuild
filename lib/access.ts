export const PUBLIC_PATHS = ['/', '/landing', '/login', '/auth/callback', '/privacy', '/terms'];

export const AUTH_PATHS = ['/pricing', '/dashboard'];

export const PAID_PATH_PREFIXES = ['/builder', '/marketplace', '/admin'];

export const PAID_TIERS = ['pro', 'agency', 'scale', 'white_label'] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export function isAuthOnlyPath(pathname: string) {
  return AUTH_PATHS.includes(pathname);
}

export function isPaidPath(pathname: string) {
  return PAID_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function hasPaidTier(tier: string | null | undefined) {
  return !!tier && PAID_TIERS.includes(tier as (typeof PAID_TIERS)[number]);
}

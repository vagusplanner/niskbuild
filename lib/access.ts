export const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/login',
  '/signup',
  '/auth/callback',
  '/pricing',
  '/privacy',
  '/terms',
];

/** Public shareable preview pages (no auth) */
export function isPreviewPath(pathname: string) {
  return pathname.startsWith('/preview/');
}

/** Paths free users may access before phone verification */
export const PHONE_VERIFY_EXEMPT_PATHS = [
  '/verify-phone',
  '/dashboard/settings',
  '/pricing',
  '/login',
  '/auth/callback',
  ...PUBLIC_PATHS,
];

export const AUTH_PATHS = ['/dashboard'];

/** Paid subscription required */
export const PAID_PATH_PREFIXES = ['/marketplace', '/admin'];

export const PAID_TIERS = [
  'pro',
  'agency',
  'scale',
  'white_label',
  'team_enterprise',
  'sovereign',
] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export function isAuthOnlyPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPaidPath(pathname: string) {
  return PAID_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function hasPaidTier(tier: string | null | undefined) {
  return !!tier && PAID_TIERS.includes(tier as (typeof PAID_TIERS)[number]);
}

export function isPhoneVerifyExemptPath(pathname: string) {
  return PHONE_VERIFY_EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

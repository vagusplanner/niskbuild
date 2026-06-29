/** Paths restricted to platform owners (firstparty.admin + VP studio) */
export const PLATFORM_OWNER_PATH_PREFIXES = [
  '/admin/layer-overview',
  '/admin/tenants',
  '/admin/apps',
  '/admin/marketplace',
  '/admin',
  '/admin/users',
  '/admin/support',
  '/admin/insights',
  '/admin/analytics',
  '/admin/social',
  '/builder/vagus-planner',
  '/vagus-planner',
] as const;

export function isPlatformOwnerPath(pathname: string) {
  return PLATFORM_OWNER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export const PUBLIC_PATHS = [
  '/',
  '/landing',
  '/login',
  '/signup',
  '/reset-password',
  '/auth/callback',
  '/pricing',
  '/privacy',
  '/terms',
  '/games',
  '/brand',
];

/** Public shareable preview pages (no auth) */
export function isPreviewPath(pathname: string) {
  return pathname.startsWith('/preview/');
}

/** Tenant runtime + offline pages (no auth) */
export function isTenantRuntimePath(pathname: string) {
  return (
    pathname === '/system/nodes-offline' ||
    pathname.startsWith('/app-runtime-engines/')
  );
}

/** Paths free users may access before phone verification */
export const PHONE_VERIFY_EXEMPT_PATHS = [
  '/verify-phone',
  '/dashboard/settings',
  '/settings',
  '/docs',
  '/brand',
  '/pricing',
  '/login',
  '/auth/callback',
  ...PUBLIC_PATHS,
];

export const AUTH_PATH_PREFIXES = ['/dashboard', '/docs', '/nps'];

/** Paid subscription required */
export const PAID_PATH_PREFIXES = ['/marketplace', '/admin'];

export const PAID_TIERS = [
  'basic',
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
  return AUTH_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

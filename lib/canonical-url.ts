/**
 * Canonical public site URL (custom domain).
 * Prefer www — Vercel already 307s apex niskbuild.com → www.niskbuild.com.
 */
export function getCanonicalAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return 'https://www.niskbuild.com';
}

/** True for the production Vercel alias (not preview deploy URLs). */
export function isProductionVercelAlias(hostname: string): boolean {
  const host = hostname.toLowerCase().split(':')[0];
  return host === 'niskbuild.vercel.app';
}

/**
 * Origin to use for auth redirects / post-login navigation.
 * Never keep users on the production *.vercel.app alias when a custom domain exists.
 */
export function getAuthRedirectOrigin(currentOrigin?: string | null): string {
  const canonical = getCanonicalAppUrl();
  if (!currentOrigin) return canonical;
  try {
    const url = new URL(currentOrigin);
    if (isProductionVercelAlias(url.hostname)) return canonical;
    return url.origin;
  } catch {
    return canonical;
  }
}

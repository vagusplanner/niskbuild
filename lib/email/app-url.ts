export function appUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://niskbuild.com').replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

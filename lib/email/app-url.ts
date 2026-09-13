export function appUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.niskbuild.com').replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Public Vagus Planner origin (SPA), not the NiskBuild builder. */
export function vpAppUrl(path = ''): string {
  const base = (
    process.env.NEXT_PUBLIC_VP_APP_URL ||
    process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL ||
    'https://vagusplanner.com'
  ).replace(/\/$/, '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

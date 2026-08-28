/**
 * True when VP is served as a static bundle (deploy proxy or local vp-live publish),
 * not from the main site root with BrowserRouter paths like /vagus-planner.
 */
export function isStaticBundleContext() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.includes('/vp-deploy/') || path.includes('/vp-live/');
}

/** Alias used in deploy-preview docs. */
export const isStaticBundleDeploy = isStaticBundleContext;

/**
 * Navigate within VP without leaving a static deploy bundle.
 * Static bundles use HashRouter — set hash (#/login). Else assign pathname.
 */
export function redirectToVpPath(path) {
  const route = path.startsWith('/') ? path : `/${path}`;
  if (isStaticBundleContext()) {
    window.location.hash = route;
    return;
  }
  window.location.href = route;
}

/** VP login — stays on bundle host for static deploy previews. */
export function redirectToVpLogin(nextPath = '/dashboard') {
  const next =
    typeof nextPath === 'string' &&
    nextPath.length > 0 &&
    !nextPath.includes('/vp-deploy/') &&
    !nextPath.includes('/vp-live/') &&
    !nextPath.includes('index.html')
      ? nextPath
      : '/dashboard';

  if (isStaticBundleContext()) {
    window.location.hash = `/login?next=${encodeURIComponent(next)}`;
    return;
  }
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

/** VP signup — same host/bundle rules as login. */
export function redirectToVpSignup(nextPath = '/dashboard') {
  const next =
    typeof nextPath === 'string' &&
    nextPath.length > 0 &&
    !nextPath.includes('/vp-deploy/') &&
    !nextPath.includes('/vp-live/') &&
    !nextPath.includes('index.html')
      ? nextPath
      : '/dashboard';

  if (isStaticBundleContext()) {
    window.location.hash = `/signup?next=${encodeURIComponent(next)}`;
    return;
  }
  window.location.href = `/signup?next=${encodeURIComponent(next)}`;
}

export function redirectToVpHome() {
  redirectToVpPath('/');
}

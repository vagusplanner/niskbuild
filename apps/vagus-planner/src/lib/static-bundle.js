import { isNativeCapacitorApp } from '@/lib/vp-platform';

/**
 * True when VP is served as a static bundle (deploy proxy or local vp-live publish),
 * not from the main site root with BrowserRouter paths like /vagus-planner.
 */
export function isStaticBundleContext() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.includes('/vp-deploy/') || path.includes('/vp-live/');
}

/**
 * Capacitor WKWebView and static deploy bundles must use HashRouter.
 * Full pathname navigations (e.g. window.location.href = '/login') leave
 * index.html and render a blank unstyled document.
 */
export function usesHashRouter() {
  if (isStaticBundleContext()) return true;
  if (isNativeCapacitorApp()) return true;
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol;
    if (proto === 'capacitor:' || proto === 'ionic:') return true;
  }
  return false;
}

/** Alias used in deploy-preview docs. */
export const isStaticBundleDeploy = isStaticBundleContext;

/**
 * Navigate within VP without leaving a static deploy / Capacitor shell.
 * HashRouter contexts set hash (#/login). Else assign pathname.
 */
export function redirectToVpPath(path) {
  const route = path.startsWith('/') ? path : `/${path}`;
  if (usesHashRouter()) {
    window.location.hash = route;
    return;
  }
  window.location.href = route;
}

/** VP login — stays on bundle host for static deploy / Capacitor. */
export function redirectToVpLogin(nextPath = '/dashboard') {
  const next =
    typeof nextPath === 'string' &&
    nextPath.length > 0 &&
    !nextPath.includes('/vp-deploy/') &&
    !nextPath.includes('/vp-live/') &&
    !nextPath.includes('index.html')
      ? nextPath
      : '/dashboard';

  if (usesHashRouter()) {
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

  if (usesHashRouter()) {
    window.location.hash = `/signup?next=${encodeURIComponent(next)}`;
    return;
  }
  window.location.href = `/signup?next=${encodeURIComponent(next)}`;
}

export function redirectToVpHome() {
  redirectToVpPath('/');
}

/**
 * True when VP is served as a static bundle (deploy proxy or local vp-live publish),
 * not from the main site root with BrowserRouter paths like /vagus-planner.
 */
export function isStaticBundleContext() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.includes('/vp-deploy/') || path.includes('/vp-live/');
}

const STRIPE_HOST_SUFFIX = '.stripe.com';

/** Allowed Stripe-hosted redirect targets (checkout + billing portal). */
export function isAllowedStripeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const { hostname } = parsed;
    return hostname === 'stripe.com' || hostname.endsWith(STRIPE_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * Navigate to a Stripe-hosted page without leaving a history entry.
 * Using replace (not assign) avoids back-navigation to expired checkout sessions
 * and prevents browsers from speculatively preloading the session URL.
 */
export function redirectToStripe(url: string): void {
  if (typeof window === 'undefined') return;
  if (!isAllowedStripeRedirectUrl(url)) {
    console.error('Refusing redirect to non-Stripe URL');
    return;
  }
  window.location.replace(url);
}

/** Remove stray preload hints for Stripe checkout sessions (browser speculation). */
export function removeStrayStripePreloads(root: ParentNode = document): void {
  if (typeof document === 'undefined') return;
  root
    .querySelectorAll<HTMLLinkElement>('link[rel="preload"][href*="stripe.com"]')
    .forEach((link) => link.remove());
}

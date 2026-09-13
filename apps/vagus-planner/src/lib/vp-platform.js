/**
 * Capacitor / web platform helpers for Vagus Planner.
 * Prefer sync window.Capacitor checks for UI gates (no async import needed).
 */

function getCapacitor() {
  if (typeof window === 'undefined') return null;
  try {
    return window.Capacitor ?? null;
  } catch {
    return null;
  }
}

/** True when running inside any Capacitor native shell (iOS or Android). */
export function isNativeCapacitorApp() {
  const cap = getCapacitor();
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * True only inside the native iOS Capacitor app.
 * False on web browsers and Android Capacitor.
 */
export function isIosNativeApp() {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) return false;
  try {
    return cap.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}

/**
 * Stripe Checkout / Customer Portal may run on web and Android native.
 * Blocked on iOS native (App Store Guideline 3.1.1).
 */
export function canUseStripePurchases() {
  return !isIosNativeApp();
}

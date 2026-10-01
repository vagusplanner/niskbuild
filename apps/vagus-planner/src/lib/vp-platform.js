/**
 * Capacitor / web platform helpers for Vagus Planner.
 *
 * Cap 7 iOS injects the native bridge before page JS, but relying only on
 * `window.Capacitor` is fragile: `@capacitor/core` may not be evaluated yet,
 * and billing UI previously evaluated once then never re-checked (fail-open
 * to Stripe). Prefer Capacitor APIs + WK bridge / protocol / Cap-build flags.
 *
 * Do NOT statically import `@capacitor/core` here — that module must stay
 * optional for pure web / Vite SSR-safe graphs. Detection fail-closes on Cap
 * builds (VITE_CAPACITOR_BUILD) and fail-opens on public web.
 */

import { useEffect, useState } from 'react';

function isBrowser() {
  return typeof window !== 'undefined';
}

/** Cap-exported SPA bundles bake this via buildVpCapacitorBuildEnv. */
export function isCapacitorBuildBundle() {
  try {
    return (
      typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_CAPACITOR_BUILD === '1' ||
        import.meta.env?.CAPACITOR_BUILD === '1')
    );
  } catch {
    return false;
  }
}

/**
 * Direct native-bridge signals — work even before / without Capacitor JS methods.
 * Matches @capacitor/core getPlatformId().
 */
function hasIosCapacitorBridge() {
  if (!isBrowser()) return false;
  try {
    return Boolean(window.webkit?.messageHandlers?.bridge);
  } catch {
    return false;
  }
}

function hasAndroidCapacitorBridge() {
  if (!isBrowser()) return false;
  try {
    return Boolean(window.androidBridge);
  } catch {
    return false;
  }
}

function getCapacitor() {
  if (!isBrowser()) return null;
  try {
    return window.Capacitor ?? null;
  } catch {
    return null;
  }
}

function protocolLooksNative() {
  if (!isBrowser()) return false;
  try {
    const proto = window.location?.protocol || '';
    return proto === 'capacitor:' || proto === 'ionic:';
  } catch {
    return false;
  }
}

function iosUserAgent() {
  if (!isBrowser()) return false;
  try {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
}

/**
 * Ensure Capacitor core has run (idempotent). Useful after mount if a gate
 * evaluated before the bridge object was fully wired.
 * Dynamic import keeps pure-web builds from hard-failing if the package is absent.
 */
export async function ensureCapacitorReady() {
  if (!isBrowser()) return getCapacitor();
  try {
    const mod = await import('@capacitor/core');
    return window.Capacitor ?? mod.Capacitor ?? null;
  } catch {
    return getCapacitor();
  }
}

/** True when running inside any Capacitor native shell (iOS or Android). */
export function isNativeCapacitorApp() {
  if (hasIosCapacitorBridge() || hasAndroidCapacitorBridge()) return true;
  if (protocolLooksNative()) return true;

  const cap = getCapacitor();
  try {
    if (cap?.isNativePlatform?.()) return true;
  } catch {
    // fall through
  }

  // Cap-exported www is only shipped inside the native shell.
  if (isCapacitorBuildBundle()) return true;

  return false;
}

/**
 * True only inside the native iOS Capacitor app.
 * False on web browsers and Android Capacitor.
 */
export function isIosNativeApp() {
  // Android bridge wins — never treat Android Cap as iOS.
  if (hasAndroidCapacitorBridge()) return false;

  // 1) WKWebView Cap bridge — most reliable on real devices, no Cap JS needed
  if (hasIosCapacitorBridge()) return true;

  // 2) Capacitor API (after core has loaded onto window)
  const cap = getCapacitor();
  try {
    if (cap?.isNativePlatform?.() && cap.getPlatform?.() === 'ios') return true;
    if (cap?.getPlatform?.() === 'android') return false;
  } catch {
    // fall through
  }

  // 3) capacitor:// / ionic:// on iOS UA (Cap default scheme is capacitor://localhost)
  if (protocolLooksNative() && iosUserAgent()) return true;

  // 4) Fail closed: Cap-exported bundles on iPhone/iPad are App Store shells.
  //    Public web builds do not bake VITE_CAPACITOR_BUILD, so Safari web is unaffected.
  if (isCapacitorBuildBundle() && iosUserAgent()) return true;

  return false;
}

/**
 * Stripe Checkout / Customer Portal may run on web and Android native.
 * Blocked on iOS native (App Store Guideline 3.1.1). Fail closed on iOS Cap.
 */
export function canUseStripePurchases() {
  return !isIosNativeApp();
}

/**
 * Reactive platform snapshot so Billing / gates re-render after Capacitor is ready
 * instead of locking in a first-paint Stripe UI forever.
 */
export function useVpPlatform() {
  const [snapshot, setSnapshot] = useState(() => ({
    // On Cap builds, wait for ensureCapacitorReady before treating platform as final.
    // Pure web can render immediately (fail-open to Stripe).
    ready: typeof window === 'undefined' ? true : !isCapacitorBuildBundle(),
    isNative: isNativeCapacitorApp(),
    isIosNative: isIosNativeApp(),
    allowStripePurchases: canUseStripePurchases(),
  }));

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (cancelled) return;
      setSnapshot({
        ready: true,
        isNative: isNativeCapacitorApp(),
        isIosNative: isIosNativeApp(),
        allowStripePurchases: canUseStripePurchases(),
      });
    };

    refresh();
    void ensureCapacitorReady().then(refresh);

    // Short retries cover rare bridge timing on cold start
    const t1 = setTimeout(refresh, 50);
    const t2 = setTimeout(refresh, 250);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return snapshot;
}

/**
 * Keep RevenueCat appUserID linked to Supabase auth on iOS.
 * Mount once in Layout alongside other Capacitor helpers.
 */
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ensureCapacitorReady, isIosNativeApp } from '@/lib/vp-platform';
import {
  configureRevenueCat,
  iapDebugLog,
  revenueCatLogIn,
  revenueCatLogOut,
} from '@/lib/revenuecat';

/** After paint + one macrotask — gives Xcode console a chance to attach. */
function afterFirstPaint() {
  return new Promise((resolve) => {
    const run = () => setTimeout(resolve, 0);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      run();
    }
  });
}

export default function CapacitorRevenueCatAuth() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  useEffect(() => {
    // Sync before any await — survives late console attach when paired with iapDebugLog persist.
    iapDebugLog('[CapacitorRevenueCatAuth] effect enter (sync)', {
      isIos: isIosNativeApp(),
      isLoadingAuth,
      isAuthenticated,
      hasUserId: Boolean(user?.id),
    });

    if (!isIosNativeApp()) return;
    // Wait for auth to settle so we do not start anonymous configure then immediately
    // re-enter and only show "joining in-flight" on the second effect run.
    if (isLoadingAuth) {
      iapDebugLog('[CapacitorRevenueCatAuth] waiting for auth settle');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        iapDebugLog('[CapacitorRevenueCatAuth] init start (pre-await)', {
          isAuthenticated,
          hasUserId: Boolean(user?.id),
        });
        await afterFirstPaint();
        if (cancelled) return;
        iapDebugLog('[CapacitorRevenueCatAuth] after first paint');
        await ensureCapacitorReady();
        if (cancelled) return;
        iapDebugLog('[CapacitorRevenueCatAuth] configure start');
        const result = await configureRevenueCat(user?.id);
        if (cancelled) return;
        if (!result?.ok) {
          console.error(
            '[CapacitorRevenueCatAuth] configure not ready:',
            result?.reason,
            result?.error instanceof Error ? result.error.stack : result?.error
          );
          return;
        }
        iapDebugLog('[CapacitorRevenueCatAuth] configure ✓');
        if (isAuthenticated && user?.id) {
          iapDebugLog('[CapacitorRevenueCatAuth] logIn start');
          await revenueCatLogIn(user.id);
          iapDebugLog('[CapacitorRevenueCatAuth] logIn done');
        }
      } catch (err) {
        console.error(
          '[CapacitorRevenueCatAuth] init failed:',
          err instanceof Error ? err.message : err,
          err instanceof Error ? err.stack : undefined
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoadingAuth, user?.id]);

  useEffect(() => {
    if (!isIosNativeApp()) return;
    if (!isAuthenticated) {
      void revenueCatLogOut();
    }
  }, [isAuthenticated]);

  return null;
}

/**
 * Keep RevenueCat appUserID linked to Supabase auth on iOS.
 * Mount once in Layout alongside other Capacitor helpers.
 */
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ensureCapacitorReady, isIosNativeApp } from '@/lib/vp-platform';
import {
  configureRevenueCat,
  revenueCatLogIn,
  revenueCatLogOut,
} from '@/lib/revenuecat';

export default function CapacitorRevenueCatAuth() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isIosNativeApp()) return;
    let cancelled = false;

    (async () => {
      try {
        console.log('[CapacitorRevenueCatAuth] init start', {
          isAuthenticated,
          hasUserId: Boolean(user?.id),
        });
        await ensureCapacitorReady();
        if (cancelled) return;
        console.log('[CapacitorRevenueCatAuth] configure start');
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
        console.log('[CapacitorRevenueCatAuth] configure ✓');
        if (isAuthenticated && user?.id) {
          console.log('[CapacitorRevenueCatAuth] logIn start');
          await revenueCatLogIn(user.id);
          console.log('[CapacitorRevenueCatAuth] logIn done');
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
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isIosNativeApp()) return;
    if (!isAuthenticated) {
      void revenueCatLogOut();
    }
  }, [isAuthenticated]);

  return null;
}

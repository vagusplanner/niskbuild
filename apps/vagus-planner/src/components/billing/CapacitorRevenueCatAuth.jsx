/**
 * Keep RevenueCat appUserID linked to Supabase auth on iOS.
 * Mount once in Layout alongside other Capacitor helpers.
 */
import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { isIosNativeApp } from '@/lib/vp-platform';
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
      await configureRevenueCat(user?.id);
      if (cancelled) return;
      if (isAuthenticated && user?.id) {
        await revenueCatLogIn(user.id);
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

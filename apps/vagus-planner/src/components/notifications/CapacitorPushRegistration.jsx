/**
 * Capacitor native push registration for the exported Vagus Planner iOS/Android shell.
 * Mount once in Layout — registers APNs token with NiskBuild on first launch.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/base44-compat';

function apiOrigin() {
  return (
    import.meta.env.VITE_NISKBUILD_ORIGIN ||
    import.meta.env.VITE_APP_ORIGIN ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  );
}

export default function CapacitorPushRegistration() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;

    async function registerPush() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        PushNotifications.addListener('registration', async (token) => {
          const pushToken = token.value;
          if (!pushToken) return;

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const accessToken = session?.access_token;
          if (!accessToken) return;

          const origin = apiOrigin();
          if (!origin || origin.startsWith('capacitor://') || origin.startsWith('file://')) {
            console.warn('[CapacitorPush] Set VITE_NISKBUILD_ORIGIN to your NiskBuild URL');
            return;
          }

          await fetch(`${origin}/api/notifications/register-device`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              pushToken,
              platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
            }),
          });
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.warn('[CapacitorPush] registration error:', err);
        });

        await PushNotifications.register();
        registeredRef.current = true;
      } catch (err) {
        console.warn('[CapacitorPush] skipped:', err);
      }
    }

    void registerPush();
  }, []);

  return null;
}

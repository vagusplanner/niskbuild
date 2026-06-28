'use client';

import { useEffect, useRef } from 'react';

/**
 * Registers the device push token with NiskBuild when running inside Capacitor (iOS/Android).
 * No-ops on web browsers.
 */
export default function CapacitorPushRegistration() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;

    async function registerPush() {
      try {
        const capCore = await import('@capacitor/core').catch(() => null);
        if (!capCore?.Capacitor?.isNativePlatform?.()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        PushNotifications.addListener('registration', async (token) => {
          const pushToken = token.value;
          if (!pushToken) return;

          await fetch('/api/notifications/register-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              pushToken,
              platform: capCore.Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
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

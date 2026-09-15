/**
 * Capacitor native push registration for the exported Vagus Planner iOS/Android shell.
 * Mount once in Layout — registers APNs token with NiskBuild once session is available.
 */
import { useEffect, useRef } from 'react';
import { getVpApiFetchHeaders, supabase } from '@/api/base44Client';

/**
 * Same origin resolution as billing / LLM / other working Capacitor API calls.
 * Prefer VITE_API_BASE_URL (baked by buildVpCapacitorBuildEnv). Never fall back to
 * capacitor:// or file:// — those are local WebView origins, not NiskBuild.
 */
function apiOrigin() {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    if (
      origin &&
      !origin.startsWith('capacitor://') &&
      !origin.startsWith('ionic://') &&
      !origin.startsWith('file://')
    ) {
      return origin.replace(/\/$/, '');
    }
  }
  return '';
}

export default function CapacitorPushRegistration() {
  const uploadedTokenRef = useRef(null);
  const pendingRef = useRef(null);
  const listenersReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let removeAuthListener = null;

    async function uploadToken(pushToken, platform) {
      if (cancelled || !pushToken) return;
      if (uploadedTokenRef.current === pushToken) return;

      const origin = apiOrigin();
      if (!origin) {
        console.warn(
          '[CapacitorPush] Set VITE_API_BASE_URL (Capacitor build) so device registration can reach NiskBuild'
        );
        pendingRef.current = { pushToken, platform };
        return;
      }

      const headers = await getVpApiFetchHeaders();
      if (!headers.Authorization) {
        // Session not ready yet — keep token and retry on auth change.
        pendingRef.current = { pushToken, platform };
        return;
      }

      try {
        const res = await fetch(`${origin}/api/notifications/register-device`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pushToken, platform }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.warn('[CapacitorPush] register-device failed:', res.status, body.slice(0, 200));
          pendingRef.current = { pushToken, platform };
          return;
        }

        uploadedTokenRef.current = pushToken;
        pendingRef.current = null;
      } catch (err) {
        console.warn('[CapacitorPush] register-device network error:', err);
        pendingRef.current = { pushToken, platform };
      }
    }

    async function flushPending() {
      const pending = pendingRef.current;
      if (!pending) return;
      await uploadToken(pending.pushToken, pending.platform);
    }

    async function registerPush() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return;

        if (!listenersReadyRef.current) {
          listenersReadyRef.current = true;

          PushNotifications.addListener('registration', async (token) => {
            const pushToken = token?.value;
            if (!pushToken) return;
            const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
            await uploadToken(pushToken, platform);
          });

          PushNotifications.addListener('registrationError', (err) => {
            console.warn('[CapacitorPush] registration error:', err);
          });
        }

        // If auth arrives after the native token callback, retry upload.
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.access_token && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
            void flushPending();
          }
        });
        removeAuthListener = () => data.subscription.unsubscribe();

        await PushNotifications.register();

        // Also try immediately in case token was already cached and session is ready.
        await flushPending();
      } catch (err) {
        console.warn('[CapacitorPush] skipped:', err);
      }
    }

    void registerPush();

    return () => {
      cancelled = true;
      if (typeof removeAuthListener === 'function') removeAuthListener();
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { buildDeviceFingerprint } from '@/lib/device-fingerprint';
import { getSafeSession } from '@/lib/supabaseSession';
import { supabase } from '@/lib/supabaseClient';

const SESSION_KEY = 'niskbuild_session_key';

function getOrCreateSessionToken(): string {
  if (typeof window === 'undefined') return '';
  let key = localStorage.getItem(SESSION_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, key);
  }
  return key;
}

export default function SessionHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopHeartbeat = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const ping = async () => {
      const session = await getSafeSession();
      if (!session?.access_token) return;

      const sessionToken = getOrCreateSessionToken();
      const deviceFingerprint = buildDeviceFingerprint();
      if (!sessionToken || !deviceFingerprint) return;

      try {
        const res = await fetch('/api/session/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ sessionToken, deviceFingerprint }),
        });

        if (res.status === 401) return;

        if (res.status === 403) {
          const data = await res.json();
          alert(
            data.error ||
              'Session limit reached on your plan. Sign out another device in Settings, then try again.'
          );
          window.location.href = '/login?reason=session_limit';
        }
      } catch {
        // Ignore transient network errors
      }
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      ping();
      intervalRef.current = setInterval(ping, 60_000);
    };

    getSafeSession().then((session) => {
      if (session?.access_token) startHeartbeat();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.access_token) {
        startHeartbeat();
      } else {
        stopHeartbeat();
      }
    });

    return () => {
      stopHeartbeat();
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

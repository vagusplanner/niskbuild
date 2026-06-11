"use client";

import { useEffect, useRef } from 'react';
import { buildDeviceFingerprint } from '@/lib/device-fingerprint';

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
    const ping = async () => {
      const sessionToken = getOrCreateSessionToken();
      const deviceFingerprint = buildDeviceFingerprint();
      if (!sessionToken || !deviceFingerprint) return;

      const res = await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionToken, deviceFingerprint }),
      });

      if (res.status === 403) {
        const data = await res.json();
        alert(
          data.error ||
            'Session limit reached on your plan. Sign out another device in Settings, then try again.'
        );
        window.location.href = '/login?reason=session_limit';
      }
    };

    ping();
    intervalRef.current = setInterval(ping, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}

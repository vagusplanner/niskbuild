/**
 * PushNotificationEngine
 *
 * Runs in the background (mounted once in Layout).
 * - Requests notification permission on first Islamic-mode load
 * - Polls for scheduled notifications and fires at the right time
 * - Handles prayer times, Zakat reminders, Hadith/Dua updates
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  fireNotification,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleNotification,
  isNativeCapacitor,
} from '@/lib/vp-notifications';

const FIRED_KEY = 'vp_fired_notifs';

function getFired() {
  try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]')); } catch { return new Set(); }
}
function markFired(id) {
  try {
    const s = getFired();
    s.add(id);
    const arr = [...s].slice(-200);
    localStorage.setItem(FIRED_KEY, JSON.stringify(arr));
  } catch {}
}

export function usePushNotifications({ islamicMode, userEmail }) {
  const permissionRequestedRef = useRef(false);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!islamicMode || permissionRequestedRef.current) return;

    const timer = setTimeout(async () => {
      const perm = await getNotificationPermission();
      if (perm === 'granted' || perm === 'denied' || perm === 'unsupported') return;
      permissionRequestedRef.current = true;
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        await fireNotification({
          title: 'Vagus Planner',
          body: 'Prayer times, Zakat & Hadith notifications are now active 🕌',
          tag: 'welcome-islamic',
        });
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [islamicMode]);

  const checkAndFireScheduled = useCallback(async () => {
    if (!userEmail) return;
    const perm = await getNotificationPermission();
    if (perm !== 'granted') return;

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 2 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 60 * 1000);

      const scheduled = await base44.entities.Notification.filter(
        { recipient_email: userEmail, is_read: false },
        '-scheduled_for',
        50
      );

      const fired = getFired();

      for (const notif of scheduled) {
        if (!notif.scheduled_for) continue;
        if (fired.has(notif.id)) continue;

        const scheduledAt = new Date(notif.scheduled_for);
        if (scheduledAt >= windowStart && scheduledAt <= windowEnd) {
          await fireNotification({
            title: notif.title,
            body: notif.message,
            tag: notif.id,
            requireInteraction: notif.priority === 'high',
          });
          markFired(notif.id);
        }
      }
    } catch {
      // Silent fail
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;

    checkAndFireScheduled();
    pollingRef.current = setInterval(checkAndFireScheduled, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userEmail, checkAndFireScheduled]);
}

export function usePrayerTimeNotifications({ settings, islamicMode }) {
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (!islamicMode || !settings) return;
    if (settings.prayer_enabled === false) return;

    const lat = settings.latitude;
    const lng = settings.longitude;
    if (!lat || !lng) return;

    let cancelled = false;

    (async () => {
      const perm = await getNotificationPermission();
      if (perm !== 'granted' || cancelled) return;

      const method = settings.prayer_method === 'ISNA' ? 2 :
                     settings.prayer_method === 'Egypt' ? 5 :
                     settings.prayer_method === 'Makkah' ? 4 :
                     settings.prayer_method === 'Karachi' ? 1 :
                     settings.prayer_method === 'Tehran' ? 7 : 3;

      const today = new Date().toISOString().split('T')[0];
      const notifyBefore = settings.notify_before_minutes || 10;
      const offsets = settings.prayer_time_offsets || {};

      try {
        const res = await fetch(`https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=${method}`);
        const data = await res.json();
        const t = data?.data?.timings;
        if (!t || cancelled) return;

        const prayers = [
          { name: 'Fajr', emoji: '🌅', time: t.Fajr, offset: offsets.fajr || 0 },
          { name: 'Dhuhr', emoji: '☀️', time: t.Dhuhr, offset: offsets.dhuhr || 0 },
          { name: 'Asr', emoji: '🌤️', time: t.Asr, offset: offsets.asr || 0 },
          { name: 'Maghrib', emoji: '🌇', time: t.Maghrib, offset: offsets.maghrib || 0 },
          { name: 'Isha', emoji: '🌙', time: t.Isha, offset: offsets.isha || 0 },
        ];

        const now = new Date();

        for (const p of prayers) {
          const [h, m] = p.time.split(':').map(Number);
          const prayerDate = new Date();
          prayerDate.setHours(h, m + p.offset, 0, 0);

          const fireAt = new Date(prayerDate.getTime() - notifyBefore * 60 * 1000);
          const msUntilFire = fireAt.getTime() - now.getTime();

          if (msUntilFire > 0 && msUntilFire < 24 * 60 * 60 * 1000) {
            const payload = {
              title: `${p.emoji} ${p.name} Prayer`,
              body: `${p.name} is in ${notifyBefore} minutes (${p.time}). Time to prepare.`,
              tag: `prayer-${p.name}-${today}`,
              requireInteraction: true,
            };

            if (isNativeCapacitor()) {
              await scheduleNotification({ ...payload, at: fireAt });
            } else {
              const timer = setTimeout(() => {
                void fireNotification(payload);
              }, msUntilFire);
              timersRef.current.push(timer);
            }
          }
        }
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, [islamicMode, settings?.latitude, settings?.longitude, settings?.prayer_method, settings?.notify_before_minutes]);
}

export default function PushNotificationEngine() { return null; }

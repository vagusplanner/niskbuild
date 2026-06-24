/**
 * PushNotificationEngine
 * 
 * Runs in the background (mounted once in Layout).
 * - Requests browser notification permission on first Islamic-mode load
 * - Polls for scheduled notifications and fires browser push notifications at the right time
 * - Handles prayer times, Zakat reminders, Hadith/Dua updates
 */
import { useEffect, useRef, useCallback } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';

const APP_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';
const FIRED_KEY = 'vp_fired_notifs'; // localStorage set of IDs already fired

function getFired() {
  try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || '[]')); } catch { return new Set(); }
}
function markFired(id) {
  try {
    const s = getFired();
    s.add(id);
    // Keep only last 200 to avoid storage bloat
    const arr = [...s].slice(-200);
    localStorage.setItem(FIRED_KEY, JSON.stringify(arr));
  } catch {}
}

function fireNotification({ title, body, tag, requireInteraction = false }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: APP_ICON,
      tag,
      requireInteraction,
      badge: APP_ICON,
    });
  } catch (e) {
    console.warn('[PushNotificationEngine] Notification error:', e);
  }
}

export function usePushNotifications({ islamicMode, userEmail }) {
  const permissionRequestedRef = useRef(false);
  const pollingRef = useRef(null);

  // Request permission once when Islamic mode is enabled
  useEffect(() => {
    if (!islamicMode || permissionRequestedRef.current) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;

    // Delay so page has loaded
    const timer = setTimeout(() => {
      permissionRequestedRef.current = true;
      Notification.requestPermission().then(result => {
        if (result === 'granted') {
          fireNotification({
            title: 'Vagus Planner',
            body: 'Prayer times, Zakat & Hadith notifications are now active 🕌',
            tag: 'welcome-islamic',
          });
        }
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [islamicMode]);

  const checkAndFireScheduled = useCallback(async () => {
    if (!userEmail || !('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 2 * 60 * 1000); // 2 min ago
      const windowEnd = new Date(now.getTime() + 60 * 1000); // 1 min from now

      const scheduled = await SDK.entities.Notification.filter(
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
          // Fire browser notification
          fireNotification({
            title: notif.title,
            body: notif.message,
            tag: notif.id,
            requireInteraction: notif.priority === 'high',
          });
          markFired(notif.id);
        }
      }
    } catch (e) {
      // Silent fail — don't break the app
    }
  }, [userEmail]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!userEmail) return;

    checkAndFireScheduled();
    pollingRef.current = setInterval(checkAndFireScheduled, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userEmail, checkAndFireScheduled]);
}

// Prayer-time live watcher: calculates time until each prayer and fires a browser notification
export function usePrayerTimeNotifications({ settings, islamicMode }) {
  const timersRef = useRef([]);

  useEffect(() => {
    // Clear any existing timers
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];

    if (!islamicMode || !settings) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (settings.prayer_enabled === false) return;

    const lat = settings.latitude;
    const lng = settings.longitude;
    if (!lat || !lng) return;

    const method = settings.prayer_method === 'ISNA' ? 2 :
                   settings.prayer_method === 'Egypt' ? 5 :
                   settings.prayer_method === 'Makkah' ? 4 :
                   settings.prayer_method === 'Karachi' ? 1 :
                   settings.prayer_method === 'Tehran' ? 7 : 3;

    const today = new Date().toISOString().split('T')[0];
    const notifyBefore = settings.notify_before_minutes || 10;
    const offsets = settings.prayer_time_offsets || {};

    fetch(`https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=${method}`)
      .then(r => r.json())
      .then(data => {
        const t = data?.data?.timings;
        if (!t) return;

        const prayers = [
          { name: 'Fajr',    emoji: '🌅', time: t.Fajr,    offset: offsets.fajr || 0 },
          { name: 'Dhuhr',   emoji: '☀️',  time: t.Dhuhr,   offset: offsets.dhuhr || 0 },
          { name: 'Asr',     emoji: '🌤️',  time: t.Asr,     offset: offsets.asr || 0 },
          { name: 'Maghrib', emoji: '🌇', time: t.Maghrib, offset: offsets.maghrib || 0 },
          { name: 'Isha',    emoji: '🌙', time: t.Isha,    offset: offsets.isha || 0 },
        ];

        const now = new Date();

        for (const p of prayers) {
          const [h, m] = p.time.split(':').map(Number);
          const prayerDate = new Date();
          prayerDate.setHours(h, m + p.offset, 0, 0);

          // Fire `notifyBefore` minutes before
          const fireAt = new Date(prayerDate.getTime() - notifyBefore * 60 * 1000);
          const msUntilFire = fireAt.getTime() - now.getTime();

          if (msUntilFire > 0 && msUntilFire < 24 * 60 * 60 * 1000) {
            const timer = setTimeout(() => {
              fireNotification({
                title: `${p.emoji} ${p.name} Prayer`,
                body: `${p.name} is in ${notifyBefore} minutes (${p.time}). Time to prepare.`,
                tag: `prayer-${p.name}-${today}`,
                requireInteraction: true,
              });
            }, msUntilFire);
            timersRef.current.push(timer);
          }
        }
      })
      .catch(() => {/* silent — no location set */});

    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, [islamicMode, settings?.latitude, settings?.longitude, settings?.prayer_method, settings?.notify_before_minutes]);
}

// Dummy default export so it can be imported as a component too if needed
export default function PushNotificationEngine() { return null; }
/**
 * Unified notification helpers — Capacitor LocalNotifications on native,
 * web Notification API in browser preview.
 */

const APP_ICON =
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';

let nativeChecked = false;
let nativePlatform = false;

export function isNativeCapacitor() {
  if (typeof window === 'undefined') return false;
  if (nativeChecked) return nativePlatform;
  try {
    const cap = window.Capacitor;
    nativePlatform = Boolean(cap?.isNativePlatform?.());
  } catch {
    nativePlatform = false;
  }
  nativeChecked = true;
  return nativePlatform;
}

export function hasWebNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** @returns {'granted'|'denied'|'default'|'unsupported'} */
export async function getNotificationPermission() {
  if (isNativeCapacitor()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.checkPermissions();
      if (display === 'granted') return 'granted';
      if (display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'unsupported';
    }
  }
  if (!hasWebNotifications()) return 'unsupported';
  return Notification.permission;
}

/** @returns {'granted'|'denied'|'default'|'unsupported'} */
export async function requestNotificationPermission() {
  if (isNativeCapacitor()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      if (display === 'granted') return 'granted';
      if (display === 'denied') return 'denied';
      return 'default';
    } catch {
      return 'unsupported';
    }
  }
  if (!hasWebNotifications()) return 'unsupported';
  return Notification.requestPermission();
}

function stableId(tag) {
  const str = String(tag ?? 'vp');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483646 || 1;
}

/** Fire immediately (native local or web). */
export async function fireNotification({ title, body, tag, requireInteraction = false }) {
  if (isNativeCapacitor()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await getNotificationPermission();
      if (perm !== 'granted') return false;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: stableId(tag ?? title),
            title: title ?? 'Vagus Planner',
            body: body ?? '',
            schedule: { at: new Date(Date.now() + 500) },
            extra: { tag },
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn('[vp-notifications] native fire failed:', e);
      return false;
    }
  }

  if (!hasWebNotifications() || Notification.permission !== 'granted') return false;
  try {
    new Notification(title ?? 'Vagus Planner', {
      body: body ?? '',
      icon: APP_ICON,
      tag: tag ?? undefined,
      requireInteraction,
      badge: APP_ICON,
    });
    return true;
  } catch (e) {
    console.warn('[vp-notifications] web fire failed:', e);
    return false;
  }
}

/** Schedule a notification at a specific Date. */
export async function scheduleNotification({ title, body, at, tag }) {
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return false;

  if (isNativeCapacitor()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perm = await getNotificationPermission();
      if (perm !== 'granted') return false;
      const id = stableId(tag ?? `${title}-${at.getTime()}`);
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: title ?? 'Vagus Planner',
            body: body ?? '',
            schedule: { at },
            extra: { tag },
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn('[vp-notifications] native schedule failed:', e);
      return false;
    }
  }

  const ms = at.getTime() - Date.now();
  if (ms <= 0) return fireNotification({ title, body, tag });
  setTimeout(() => {
    void fireNotification({ title, body, tag });
  }, ms);
  return true;
}

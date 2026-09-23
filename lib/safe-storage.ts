/**
 * Safe Web Storage access — never throws in sandboxed iframes,
 * Firefox tracking-protection strict mode, or private contexts
 * where `localStorage` is forbidden.
 */

function storageAvailable(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    const probe = '__nisk_ls_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function safeLocalStorageGet(key: string): string | null {
  try {
    return storageAvailable()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    const s = storageAvailable();
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    storageAvailable()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

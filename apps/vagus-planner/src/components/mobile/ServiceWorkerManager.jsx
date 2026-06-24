/**
 * ServiceWorkerManager
 * Registers /service-worker.js and handles update notifications + background sync.
 */
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function ServiceWorkerManager() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        console.log('[SW] Registered', reg.scope);

        // Hourly update check
        setInterval(() => reg.update(), 60 * 60 * 1000);

        // New version available
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('New version available!', {
                action: { label: 'Refresh', onClick: () => window.location.reload() },
                duration: Infinity,
              });
            }
          });
        });

        // Listen for TRIGGER_SYNC from SW (background sync)
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'TRIGGER_SYNC') {
            window.dispatchEvent(new Event('vagus-sync'));
          }
        });

      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    // Register after first paint
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  // Register background sync tag when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && 'sync' in reg) {
          reg.sync.register('vagus-sync').catch(() => {});
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
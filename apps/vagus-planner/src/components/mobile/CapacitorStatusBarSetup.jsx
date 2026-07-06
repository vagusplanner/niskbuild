/**
 * Native status bar setup for Capacitor iOS/Android exports.
 * Config also sets overlaysWebView: false in capacitor.config.json.
 */
import { useEffect } from 'react';

export default function CapacitorStatusBarSetup() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform() || cancelled) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
      } catch (err) {
        console.warn('[CapacitorStatusBar] setup skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

'use client';

import { useCallback, useEffect, useState } from 'react';

export type FullAppPreviewNavState = {
  canGoBack: boolean;
  canGoForward: boolean;
  path: string;
};

const INITIAL: FullAppPreviewNavState = {
  canGoBack: false,
  canGoForward: false,
  path: '/',
};

/**
 * Tracks SPA history inside the Full App preview iframe via postMessage.
 * Back/forward post `niskbuild-preview-nav` into the iframe (HashRouter).
 */
export function useFullAppPreviewNav(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const [nav, setNav] = useState<FullAppPreviewNavState>(INITIAL);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'niskbuild-preview-history') return;
      setNav({
        canGoBack: Boolean(data.canGoBack),
        canGoForward: Boolean(data.canGoForward),
        path: typeof data.path === 'string' ? data.path : '/',
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const reset = useCallback(() => setNav(INITIAL), []);

  const postNav = useCallback(
    (action: 'back' | 'forward' | 'reload') => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage({ type: 'niskbuild-preview-nav', action }, '*');
      } catch {
        /* ignore */
      }
    },
    [iframeRef]
  );

  const goBack = useCallback(() => postNav('back'), [postNav]);
  const goForward = useCallback(() => postNav('forward'), [postNav]);
  const requestReload = useCallback(() => postNav('reload'), [postNav]);

  return { nav, reset, goBack, goForward, requestReload };
}

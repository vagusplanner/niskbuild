'use client';

import { useCallback, useState } from 'react';
import FullAppLivePreview from '@/app/components/FullAppLivePreview';
import PreviewBrowserChrome from '@/app/components/PreviewBrowserChrome';
import PreviewConsolePanel from '@/app/components/PreviewConsolePanel';
import { usePreviewConsole } from '@/app/components/usePreviewConsole';
import { EMBER_HABITS_PROJECT_FILES } from '@/lib/full-app-preview/ember-habits-fixture';

/**
 * Builder-chrome integration smoke — same FullAppLivePreview + console/nav
 * wiring as the real builder, without auth.
 */
export default function FullAppBuilderPreviewSmokePage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [nav, setNav] = useState({
    canGoBack: false,
    canGoForward: false,
    goBack: () => {},
    goForward: () => {},
  });
  const { entries, clear, errorCount } = usePreviewConsole(reloadKey, false);

  const onNavChange = useCallback(
    (next: {
      canGoBack: boolean;
      canGoForward: boolean;
      goBack: () => void;
      goForward: () => void;
    }) => setNav(next),
    []
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0c10',
        color: '#e8eef4',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <header
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1e2630',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <strong style={{ fontSize: 14 }}>Full App builder preview (smoke)</strong>
        <span style={{ fontSize: 12, color: '#8b98a5' }}>
          Ember Habits · {EMBER_HABITS_PROJECT_FILES.length} files · real FullAppLivePreview
        </span>
        <PreviewBrowserChrome
          canGoBack={nav.canGoBack}
          canGoForward={nav.canGoForward}
          onBack={nav.goBack}
          onForward={nav.goForward}
          onReload={() => setReloadKey((k) => k + 1)}
        />
        <button
          type="button"
          onClick={() => setConsoleOpen((v) => !v)}
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #2a3540',
            background: '#141a22',
            color: errorCount ? '#f87171' : '#e8eef4',
            cursor: 'pointer',
          }}
        >
          Console{errorCount ? ` (${errorCount})` : ''}
        </button>
      </header>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <FullAppLivePreview
          projectFiles={EMBER_HABITS_PROJECT_FILES}
          isGenerating={false}
          previewFrameClass="w-full h-full absolute inset-0"
          reloadKey={reloadKey}
          onNavChange={onNavChange}
        />
      </div>
      <PreviewConsolePanel entries={entries} onClear={clear} open={consoleOpen} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  ensureEsbuildInitialized,
  bundleFullAppPreview,
  buildFullAppPreviewHtml,
} from '@/lib/full-app-preview';
import { SPIKE_HELLO_WORLD_FILES } from '@/lib/full-app-preview/spike-fixture';

type SpikeStatus =
  | { phase: 'init'; detail?: string }
  | { phase: 'bundling' }
  | { phase: 'ready'; html: string; durationMs: number; entry: string; codeBytes: number }
  | { phase: 'error'; message: string };

/**
 * Isolated spike page — proves esbuild-wasm can bundle + render React live.
 * Not wired into builder chrome yet.
 */
export default function FullAppPreviewSpikePage() {
  const [status, setStatus] = useState<SpikeStatus>({ phase: 'init' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus({ phase: 'init', detail: 'importing esbuild-wasm…' });
        const wasmURL = `${window.location.origin}/preview-runtime/esbuild.wasm`;

        const initWithTimeout = Promise.race([
          ensureEsbuildInitialized({ wasmURL, worker: false }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `esbuild initialize timed out after 45s (wasmURL=${wasmURL})`
                  )
                ),
              45000
            )
          ),
        ]);

        await initWithTimeout;
        if (cancelled) return;

        setStatus({ phase: 'bundling' });
        const esbuild = await ensureEsbuildInitialized();
        const result = await bundleFullAppPreview(esbuild, SPIKE_HELLO_WORLD_FILES);
        if (cancelled) return;

        if (!result.ok) {
          setStatus({ phase: 'error', message: result.error });
          return;
        }

        const html = buildFullAppPreviewHtml({
          code: result.code,
          css: result.css,
          title: 'Full App Preview Spike',
        });

        setStatus({
          phase: 'ready',
          html,
          durationMs: result.durationMs,
          entry: result.entry,
          codeBytes: result.code.length,
        });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ''}`
            : String(err);
        console.error('[full-app-preview-spike]', err);
        setStatus({ phase: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
          padding: '12px 16px',
          borderBottom: '1px solid #1e2630',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          alignItems: 'baseline',
        }}
      >
        <strong style={{ fontSize: 14 }}>Full App preview spike</strong>
        <span style={{ fontSize: 12, color: '#8b98a5' }}>
          esbuild-wasm · curated react/react-dom · no builder chrome yet
        </span>
        {status.phase === 'ready' && (
          <span style={{ fontSize: 12, color: '#7dd3c0' }}>
            bundled {status.entry} in {status.durationMs}ms · {status.codeBytes} bytes ESM
          </span>
        )}
        {status.phase === 'init' && (
          <span style={{ fontSize: 12, color: '#8b98a5' }}>
            Loading esbuild.wasm…{status.detail ? ` (${status.detail})` : ''}
          </span>
        )}
        {status.phase === 'bundling' && (
          <span style={{ fontSize: 12, color: '#8b98a5' }}>Bundling hello-world…</span>
        )}
        {status.phase === 'error' && (
          <span style={{ fontSize: 12, color: '#f87171' }}>error</span>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
        {status.phase === 'ready' ? (
          <iframe
            title="Full App preview spike"
            srcDoc={status.html}
            style={{
              width: '100%',
              height: 'calc(100vh - 64px)',
              border: '1px solid #1e2630',
              borderRadius: 8,
              background: '#fff',
            }}
            sandbox="allow-scripts allow-forms allow-modals"
            referrerPolicy="no-referrer"
          />
        ) : status.phase === 'error' ? (
          <pre
            style={{
              margin: 0,
              padding: 16,
              whiteSpace: 'pre-wrap',
              color: '#f87171',
              fontSize: 13,
            }}
          >
            {status.message}
          </pre>
        ) : (
          <p style={{ color: '#8b98a5', fontSize: 13, padding: 16 }}>Working…</p>
        )}
      </div>
    </div>
  );
}

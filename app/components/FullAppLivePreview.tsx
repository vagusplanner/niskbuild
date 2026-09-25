'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureEsbuildInitialized,
  bundleFullAppPreview,
  buildFullAppPreviewHtml,
  findPreviewEntry,
} from '@/lib/full-app-preview';
import { BUILDER_PREVIEW_SANDBOX } from '@/lib/preview-html';
import { fullAppPreviewPlaceholder } from '@/lib/full-app-bundle';
import type { ProjectFile } from '@/lib/project-files';
import { useFullAppPreviewNav } from '@/app/components/useFullAppPreviewNav';

type FullAppLivePreviewProps = {
  projectFiles: ProjectFile[];
  isGenerating: boolean;
  previewFrameClass: string;
  /** Bumped by chrome reload — remount + rebundle. */
  reloadKey: number;
  /**
   * Imperative route navigation from the builder chrome (route dropdown).
   * Bumping `nonce` re-sends even if `path` is unchanged.
   */
  navigateRequest?: { path: string; nonce: number } | null;
  /** BYO Supabase credentials for DataClient in the preview iframe. */
  backendEnv?: { supabaseUrl: string; supabaseAnonKey: string } | null;
  onNavChange?: (nav: {
    canGoBack: boolean;
    canGoForward: boolean;
    goBack: () => void;
    goForward: () => void;
    goToPath: (path: string) => void;
  }) => void;
};

type BundlePhase =
  | { kind: 'idle' }
  | { kind: 'loading'; detail: string }
  | { kind: 'ready'; html: string; durationMs: number }
  | { kind: 'error'; message: string };

function filesToRecord(files: ProjectFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) {
    if (f.path && typeof f.content === 'string') out[f.path] = f.content;
  }
  return out;
}

function filesSignature(files: ProjectFile[]): string {
  return files
    .map((f) => `${f.path}:${f.content.length}:${hashQuick(f.content)}`)
    .sort()
    .join('|');
}

function hashQuick(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Live Full App preview: esbuild-wasm bundle → srcDoc iframe.
 * Reuses the same sandbox + console postMessage protocol as Simple mode.
 */
export default function FullAppLivePreview({
  projectFiles,
  isGenerating,
  previewFrameClass,
  reloadKey,
  navigateRequest = null,
  backendEnv = null,
  onNavChange,
}: FullAppLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { nav, reset, goBack, goForward, goToPath } = useFullAppPreviewNav(iframeRef);
  const [phase, setPhase] = useState<BundlePhase>({ kind: 'idle' });
  const [iframeReady, setIframeReady] = useState(false);
  const signature = useMemo(() => filesSignature(projectFiles), [projectFiles]);
  const hasEntry = useMemo(
    () => Boolean(findPreviewEntry(filesToRecord(projectFiles))),
    [projectFiles]
  );

  useEffect(() => {
    onNavChange?.({
      canGoBack: nav.canGoBack,
      canGoForward: nav.canGoForward,
      goBack,
      goForward,
      goToPath,
    });
  }, [nav.canGoBack, nav.canGoForward, goBack, goForward, goToPath, onNavChange]);

  // Direct route selection from chrome — don't rely on stale goToPath closures.
  useEffect(() => {
    if (!navigateRequest?.path || phase.kind !== 'ready' || !iframeReady) return;
    const path = navigateRequest.path.startsWith('/')
      ? navigateRequest.path
      : `/${navigateRequest.path}`;

    let attempts = 0;
    const send = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) {
        if (attempts++ < 10) window.setTimeout(send, 50);
        return;
      }
      try {
        win.postMessage(
          { type: 'niskbuild-preview-nav', action: 'goto', path },
          '*'
        );
      } catch {
        /* ignore */
      }
    };
    // Let the iframe finish registering its message listener after mount.
    const t = window.setTimeout(send, 0);
    return () => window.clearTimeout(t);
  }, [navigateRequest?.path, navigateRequest?.nonce, phase.kind, iframeReady]);

  useEffect(() => {
    if (isGenerating) {
      setPhase({ kind: 'idle' });
      reset();
      return;
    }
    if (!hasEntry) {
      setPhase({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      (async () => {
        try {
          setPhase({ kind: 'loading', detail: 'Loading esbuild…' });
          await ensureEsbuildInitialized({
            wasmURL: `${window.location.origin}/preview-runtime/esbuild.wasm`,
            worker: false,
          });
          if (cancelled) return;

          setPhase({ kind: 'loading', detail: 'Bundling…' });
          const esbuild = await ensureEsbuildInitialized();
          const result = await bundleFullAppPreview(
            esbuild,
            filesToRecord(projectFiles)
          );
          if (cancelled) return;

          if (!result.ok) {
            setPhase({ kind: 'error', message: result.error });
            return;
          }

          const html = buildFullAppPreviewHtml({
            code: result.code,
            css: result.css,
            title: 'Full App Preview',
            backend: backendEnv,
          });
          reset();
          setPhase({
            kind: 'ready',
            html,
            durationMs: result.durationMs,
          });
        } catch (err) {
          if (cancelled) return;
          setPhase({
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // reloadKey forces remount/rebundle
  }, [signature, isGenerating, hasEntry, reloadKey, projectFiles, reset, backendEnv]);

  if (isGenerating) {
    return (
      <iframe
        key={`gen-${reloadKey}`}
        title="Live Preview"
        srcDoc={fullAppPreviewPlaceholder({
          generating: true,
          fileCount: projectFiles.length,
        })}
        className={`${previewFrameClass} border-0 bg-white`}
        sandbox={BUILDER_PREVIEW_SANDBOX}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (!hasEntry) {
    return (
      <iframe
        key={`empty-${reloadKey}`}
        title="Live Preview"
        srcDoc={fullAppPreviewPlaceholder({ fileCount: projectFiles.length })}
        className={`${previewFrameClass} border-0 bg-white`}
        sandbox={BUILDER_PREVIEW_SANDBOX}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (phase.kind === 'error') {
    return (
      <iframe
        key={`err-${reloadKey}`}
        title="Live Preview"
        srcDoc={fullAppPreviewPlaceholder({
          error: phase.message,
          fileCount: projectFiles.length,
        })}
        className={`${previewFrameClass} border-0 bg-white`}
        sandbox={BUILDER_PREVIEW_SANDBOX}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (phase.kind !== 'ready') {
    const detail = phase.kind === 'loading' ? phase.detail : 'Preparing preview…';
    return (
      <div
        className={`${previewFrameClass} border-0 bg-[var(--iron-surface)] flex items-center justify-center text-sm text-nisk-muted`}
      >
        {detail}
      </div>
    );
  }

  return (
    <FullAppBlobIframe
      iframeRef={iframeRef}
      html={phase.html}
      reloadKey={reloadKey}
      durationMs={phase.durationMs}
      previewFrameClass={previewFrameClass}
      onIframeLoad={() => setIframeReady(true)}
      onIframeUnload={() => setIframeReady(false)}
    />
  );
}

/**
 * Blob URL (not srcDoc) so React Router gets a real URL — about:srcdoc breaks HashRouter.
 */
function FullAppBlobIframe({
  html,
  reloadKey,
  durationMs,
  previewFrameClass,
  iframeRef,
  onIframeLoad,
  onIframeUnload,
}: {
  html: string;
  reloadKey: number;
  durationMs: number;
  previewFrameClass: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
  onIframeUnload?: () => void;
}) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    onIframeUnload?.();
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    setSrc(url);
    return () => {
      onIframeUnload?.();
      URL.revokeObjectURL(url);
    };
    // Intentionally omit onIframeUnload from deps — parent passes inline setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, reloadKey, durationMs]);

  if (!src) {
    return (
      <div
        className={`${previewFrameClass} border-0 bg-[var(--iron-surface)] flex items-center justify-center text-sm text-nisk-muted`}
      >
        Mounting preview…
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={`blob-${reloadKey}-${durationMs}`}
      title="Live Preview"
      src={src}
      className={`${previewFrameClass} border-0 bg-white`}
      sandbox={BUILDER_PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      onLoad={() => onIframeLoad?.()}
    />
  );
}

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
  onNavChange?: (nav: {
    canGoBack: boolean;
    canGoForward: boolean;
    goBack: () => void;
    goForward: () => void;
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
  onNavChange,
}: FullAppLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { nav, reset, goBack, goForward } = useFullAppPreviewNav(iframeRef);
  const [phase, setPhase] = useState<BundlePhase>({ kind: 'idle' });
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
    });
  }, [nav.canGoBack, nav.canGoForward, goBack, goForward, onNavChange]);

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
  }, [signature, isGenerating, hasEntry, reloadKey, projectFiles, reset]);

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
}: {
  html: string;
  reloadKey: number;
  durationMs: number;
  previewFrameClass: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
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
    />
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FigmaScreenshotImportProps {
  projectId?: string | null;
  userPrompt: string;
  onBuild: (combinedPrompt: string) => void;
  disabled?: boolean;
  /** Hide inline disclaimer — shown inside panel instead */
  compact?: boolean;
  /** Controlled open state (for attach menu integration) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide trigger button — panel only */
  hideTrigger?: boolean;
}

export default function FigmaScreenshotImport({
  projectId,
  userPrompt,
  onBuild,
  disabled = false,
  compact = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: FigmaScreenshotImportProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [figmaLink, setFigmaLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const resetFile = useCallback(() => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  const acceptFile = useCallback(
    (next: File) => {
      if (!['image/jpeg', 'image/png'].includes(next.type)) {
        setError('Please upload a PNG or JPG screenshot.');
        return;
      }
      if (next.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB.');
        return;
      }
      setError(null);
      setFile(next);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(next));
    },
    [previewUrl]
  );

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }

    const update = () => {
      const width = Math.min(320, window.innerWidth - 16);

      if (hideTrigger) {
        setPanelPos({
          top: Math.max(16, window.innerHeight - 400),
          left: Math.max(8, 16),
          width,
        });
        return;
      }

      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = window.innerWidth - width - 8;
      }
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.max(8, left),
        width,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, hideTrigger]);

  const handleImportAndBuild = async () => {
    if (!file) {
      setError('Upload a screenshot of your Figma frame first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('image', file);
      if (figmaLink.trim()) form.append('figmaReferenceLink', figmaLink.trim());
      if (userPrompt.trim()) form.append('userPrompt', userPrompt.trim());
      if (projectId) form.append('projectId', projectId);

      const response = await fetch('/api/figma/screenshot-import', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Import failed');
        return;
      }

      setOpen(false);
      resetFile();
      setFigmaLink('');
      onBuild(data.combinedPrompt as string);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const panel = open ? (
    <div
      className="fixed z-[200] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] p-3 space-y-3"
      style={
        panelPos
          ? { top: panelPos.top, left: panelPos.left, width: panelPos.width }
          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320 }
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--foreground)]">Figma screenshot import</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-nisk-muted hover:text-[var(--foreground)] text-lg leading-none"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <p className="text-[9px] text-nisk-muted leading-snug">
        Imports from a screenshot, not live Figma data — results approximate the design and may need
        adjustment.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) acceptFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/10'
            : 'border-[var(--border)] hover:border-[var(--copper-primary)]/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) acceptFile(picked);
          }}
        />
        {previewUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="max-h-28 mx-auto rounded border border-[var(--border)] object-contain"
            />
            <p className="text-[10px] text-nisk-muted truncate">{file?.name}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetFile();
              }}
              className="text-[10px] text-[var(--copper-melt)] hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--foreground)]">Drop PNG/JPG screenshot</p>
            <p className="text-[10px] text-nisk-muted mt-1">Export a frame from Figma as PNG</p>
          </>
        )}
      </div>

      <div>
        <label className="text-[10px] text-nisk-muted block mb-1">
          Paste your Figma frame share link <span className="opacity-70">(optional)</span>
        </label>
        <input
          type="url"
          placeholder="https://www.figma.com/design/…"
          value={figmaLink}
          onChange={(e) => setFigmaLink(e.target.value)}
          className="w-full p-2 glass-input rounded-lg text-xs"
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-[10px] text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg px-2 py-1.5">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleImportAndBuild()}
        disabled={loading || !file}
        className="w-full btn-primary py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
      >
        {loading ? 'Analyzing design…' : 'Import & Build'}
      </button>
    </div>
  ) : null;

  return (
    <div className="relative shrink-0">
      {!hideTrigger && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled || loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[10px] font-medium text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/40 transition-colors disabled:opacity-50"
          aria-expanded={open}
        >
          <span aria-hidden>🎨</span>
          Import from Figma
        </button>
      )}

      {!compact && !hideTrigger && (
        <p className="text-[9px] text-nisk-muted leading-snug mt-1 max-w-[220px]">
          Imports from a screenshot, not live Figma data — results approximate the design and may
          need adjustment, especially for exact spacing and interactions.
        </p>
      )}

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

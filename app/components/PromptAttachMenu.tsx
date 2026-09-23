"use client";

import { useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import DockPopover from '@/app/components/DockPopover';

export type PromptAttachMenuProps = {
  disabled?: boolean;
  onUploadZip?: (file: File) => void;
  onOpenFigma?: () => void;
  onOpenGooglePlaces?: () => void;
  figmaPanelRef?: RefObject<HTMLDivElement | null>;
  /** Override file picker accept (default: .zip) */
  uploadAccept?: string;
  uploadLabel?: string;
};

export default function PromptAttachMenu({
  disabled = false,
  onUploadZip,
  onOpenFigma,
  onOpenGooglePlaces,
  uploadAccept = '.zip,application/zip',
  uploadLabel = 'Upload from computer',
}: PromptAttachMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-0.5 h-8 pl-2 pr-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/40 transition-colors disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Attach or import"
        title="Attach or import"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <svg
          className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={uploadAccept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUploadZip) onUploadZip(file);
          e.target.value = '';
        }}
      />

      <DockPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={rootRef}
        width={220}
      >
        <div role="menu" className="py-1">
          {onUploadZip && (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              onClick={() => pick(() => fileRef.current?.click())}
            >
              <span className="mr-2" aria-hidden>
                💻
              </span>
              {uploadLabel}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            onClick={() =>
              pick(() => {
                if (onOpenGooglePlaces) onOpenGooglePlaces();
              })
            }
          >
            <span className="mr-2" aria-hidden>
              📍
            </span>
            Google Business import
          </button>
          <Link
            href="/marketplace"
            role="menuitem"
            className="block px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="mr-2" aria-hidden>
              📚
            </span>
            Template library
          </Link>
          {onOpenFigma && (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              onClick={() => pick(onOpenFigma)}
            >
              <span className="mr-2" aria-hidden>
                🎨
              </span>
              Import from Figma
            </button>
          )}
        </div>
      </DockPopover>
    </div>
  );
}

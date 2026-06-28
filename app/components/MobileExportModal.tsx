"use client";

import Link from 'next/link';

type MobileExportModalProps = {
  open: boolean;
  projectTitle: string;
  canPwa: boolean;
  canNative: boolean;
  exporting: 'pwa' | 'native' | null;
  onClose: () => void;
  onExportPwa: () => void;
  onExportNative: () => void;
};

export default function MobileExportModal({
  open,
  projectTitle,
  canPwa,
  canNative,
  exporting,
  onClose,
  onExportPwa,
  onExportNative,
}: MobileExportModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-nisk bg-nisk-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-nisk">
          <div>
            <h2 className="text-lg font-semibold text-white">Export as Mobile App</h2>
            <p className="text-xs text-nisk-muted mt-0.5 truncate max-w-[280px]">{projectTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-nisk-muted hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            type="button"
            onClick={onExportPwa}
            disabled={!canPwa || exporting !== null}
            title="Install on any iPhone or Android — no App Store needed. Share the link and users tap Add to Home Screen."
            className="w-full text-left p-4 rounded-xl border border-nisk bg-nisk-surface hover:border-[var(--accent-cyan)]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white group-hover:text-[var(--accent-cyan)]">
                  📱 PWA Export
                </p>
                <p className="text-xs text-nisk-muted mt-1">
                  Works on all phones via browser — Pro plan and above
                </p>
                <p className="text-xs text-[var(--accent-cyan)]/80 mt-2">
                  Install on any iPhone or Android — no App Store needed. Share the link and users tap Add to Home Screen.
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 shrink-0">
                {exporting === 'pwa' ? '…' : 'Pro+'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onExportNative}
            disabled={!canNative || exporting !== null}
            className="w-full text-left p-4 rounded-xl border border-nisk bg-nisk-surface hover:border-[var(--primary)]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white group-hover:text-[var(--primary)]">
                  🏗️ Native App Export
                </p>
                <p className="text-xs text-nisk-muted mt-1">
                  Capacitor bundle — requires Xcode or Android Studio
                </p>
                {!canNative && (
                  <p className="text-xs text-yellow-400/90 mt-2">
                    Upgrade to Agency+ to unlock native App Store builds.
                  </p>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-purple-400 shrink-0">
                {exporting === 'native' ? '…' : 'Agency+'}
              </span>
            </div>
          </button>

          <Link
            href="/docs/progressive-web-apps-pwa"
            className="block text-center text-xs text-[var(--accent-cyan)] hover:underline"
            onClick={onClose}
          >
            What is a PWA? Read the guide →
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';

type PreviewBrowserChromeProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  disabled?: boolean;
};

/** Mini browser chrome for the live preview — history is preview-internal only. */
export default function PreviewBrowserChrome({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onReload,
  disabled = false,
}: PreviewBrowserChromeProps) {
  const btn =
    'p-1.5 rounded-md transition-colors disabled:opacity-35 disabled:pointer-events-none text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]';

  return (
    <div
      className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--code-bg)] border border-[var(--border)]"
      role="group"
      aria-label="Preview navigation"
    >
      <button
        type="button"
        className={btn}
        onClick={onBack}
        disabled={disabled || !canGoBack}
        title="Back"
        aria-label="Preview back"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        onClick={onForward}
        disabled={disabled || !canGoForward}
        title="Forward"
        aria-label="Preview forward"
      >
        <ArrowRight className="w-4 h-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        onClick={onReload}
        disabled={disabled}
        title="Reload preview"
        aria-label="Reload preview"
      >
        <RotateCw className="w-4 h-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}

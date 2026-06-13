"use client";

import { useEffect, useRef, useState } from 'react';

type BuilderActionsMenuProps = {
  canAct: boolean;
  isExporting: boolean;
  mobileExporting: boolean;
  canPwa: boolean;
  onSave: () => void;
  onExportZip: () => void;
  onMobileExport: () => void;
  onDeployLive: () => void;
};

export default function BuilderActionsMenu({
  canAct,
  isExporting,
  mobileExporting,
  canPwa,
  onSave,
  onExportZip,
  onMobileExport,
  onDeployLive,
}: BuilderActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!canAct}
        className="btn-secondary px-3 py-1.5 text-xs rounded-lg disabled:opacity-40 flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Actions
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-50 py-1 overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { onSave(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)]"
          >
            💾 Save project
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onExportZip(); setOpen(false); }}
            disabled={isExporting}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            {isExporting ? '📦 Exporting…' : '📦 Export ZIP'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onMobileExport(); setOpen(false); }}
            disabled={mobileExporting}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            📱 Export as Mobile App
            {!canPwa && <span className="block text-[10px] text-nisk-muted">Pro plan required</span>}
          </button>
          <div className="border-t border-nisk my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { onDeployLive(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--success)] hover:bg-[var(--surface-elevated)]"
          >
            🌐 Deploy live preview
          </button>
        </div>
      )}
    </div>
  );
}

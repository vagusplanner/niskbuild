"use client";

import { useEffect, useRef, useState } from 'react';

type BuilderActionsMenuProps = {
  canAct: boolean;
  isExporting: boolean;
  mobileExporting: boolean;
  canPwa: boolean;
  canVisualEdit: boolean;
  visualEditMode: boolean;
  inspectMode: boolean;
  onSave: () => void;
  onExportZip: () => void;
  onMobileExport: () => void;
  onDeployLive: () => void;
  onToggleVisualEdit: () => void;
  onToggleInspect: () => void;
  onRestoreZip: (file: File) => Promise<void>;
};

export default function BuilderActionsMenu({
  canAct,
  isExporting,
  mobileExporting,
  canPwa,
  canVisualEdit,
  visualEditMode,
  inspectMode,
  onSave,
  onExportZip,
  onMobileExport,
  onDeployLive,
  onToggleVisualEdit,
  onToggleInspect,
  onRestoreZip,
}: BuilderActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await onRestoreZip(file);
          e.target.value = '';
          close();
        }}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!canAct && !canVisualEdit}
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
          className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-50 py-1 overflow-hidden"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleVisualEdit(); close(); }}
            disabled={!canVisualEdit}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-40 ${
              visualEditMode ? 'text-emerald-400' : 'text-gray-200'
            }`}
          >
            🎨 {visualEditMode ? 'Exit visual edit' : 'Visual edit mode'}
            {!canVisualEdit && (
              <span className="block text-[10px] text-nisk-muted">Pro plan required</span>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleInspect(); close(); }}
            disabled={visualEditMode}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-40 ${
              inspectMode ? 'text-[var(--accent-cyan)]' : 'text-gray-200'
            }`}
          >
            🎯 {inspectMode ? 'Exit target mode' : 'Target element edit'}
          </button>
          <div className="border-t border-nisk my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { onSave(); close(); }}
            disabled={!canAct}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            💾 Save project
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onExportZip(); close(); }}
            disabled={!canAct || isExporting}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            {isExporting ? '📦 Exporting…' : '📦 Export ZIP'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onMobileExport(); close(); }}
            disabled={!canAct || mobileExporting}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            📱 Export as Mobile App
            {!canPwa && <span className="block text-[10px] text-nisk-muted">Pro plan required</span>}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { fileRef.current?.click(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-[var(--surface-elevated)]"
          >
            📂 Import ZIP
          </button>
          <div className="border-t border-nisk my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { onDeployLive(); close(); }}
            disabled={!canAct}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--success)] hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            🌐 Deploy live preview
          </button>
        </div>
      )}
    </div>
  );
}

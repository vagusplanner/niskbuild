"use client";

import { useEffect, useRef, useState } from 'react';
import {
  PREVIEW_DEVICE_OPTIONS,
  type PreviewDevice,
} from '@/app/components/PreviewDeviceSwitcher';

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
  onOpenInspector?: () => void;
  inspectorOpen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenHistory?: () => void;
  versionHistoryOpen?: boolean;
  previewDevice?: PreviewDevice;
  onPreviewDeviceChange?: (device: PreviewDevice) => void;
  canShareSocial?: boolean;
  onOpenSocialPublisher?: () => void;
  onRunExportAudit?: () => void;
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
  onOpenInspector,
  inspectorOpen,
  onToggleFullscreen,
  onOpenHistory,
  versionHistoryOpen,
  previewDevice,
  onPreviewDeviceChange,
  canShareSocial,
  onOpenSocialPublisher,
  onRunExportAudit,
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
        className="btn-secondary px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Menu
        <span className="text-[10px] opacity-70">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-50 py-1 overflow-hidden"
        >
          {onOpenInspector && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onOpenInspector(); close(); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] ${
                inspectorOpen ? 'text-[var(--copper-melt)]' : 'text-gray-200'
              }`}
            >
              {inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            </button>
          )}
          {onOpenHistory && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onOpenHistory(); close(); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] ${
                versionHistoryOpen ? 'text-[var(--copper-melt)]' : 'text-gray-200'
              }`}
            >
              Version history
            </button>
          )}
          {onToggleFullscreen && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onToggleFullscreen(); close(); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)]"
            >
              Fullscreen preview
            </button>
          )}
          {onPreviewDeviceChange && (
            <>
              <div className="border-t border-nisk my-1" />
              <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-nisk-muted">Preview size</p>
              {PREVIEW_DEVICE_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  onClick={() => { onPreviewDeviceChange(id); close(); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] ${
                    previewDevice === id ? 'text-[var(--copper-melt)]' : 'text-gray-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {label}
                  </span>
                </button>
              ))}
            </>
          )}
          {(onOpenInspector || onOpenHistory || onToggleFullscreen) && (
            <div className="border-t border-nisk my-1" />
          )}
          {onRunExportAudit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onRunExportAudit();
                close();
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)]"
            >
              Export audit
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleVisualEdit(); close(); }}
            disabled={!canVisualEdit}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-40 text-gray-200"
          >
            {visualEditMode ? 'Exit visual edit' : 'Visual edit'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleInspect(); close(); }}
            disabled={visualEditMode}
            className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-40 text-gray-200"
          >
            {inspectMode ? 'Exit target mode' : 'Target element'}
          </button>
          <div className="border-t border-nisk my-1" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { onSave(); close(); }}
            disabled={!canAct}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            Save project
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onExportZip(); close(); }}
            disabled={!canAct || isExporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            {isExporting ? 'Exporting…' : 'Export ZIP'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onMobileExport(); close(); }}
            disabled={!canAct || mobileExporting}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            Export mobile app
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { fileRef.current?.click(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-[var(--surface-elevated)]"
          >
            Import ZIP
          </button>
          <div className="border-t border-nisk my-1" />
          {canShareSocial && onOpenSocialPublisher && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onOpenSocialPublisher(); close(); }}
              className="w-full text-left px-4 py-2 text-sm text-[var(--copper-melt)] hover:bg-[var(--surface-elevated)]"
            >
              Share to Social
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { onDeployLive(); close(); }}
            disabled={!canAct}
            className="w-full text-left px-4 py-2 text-sm text-[var(--copper-melt)] hover:bg-[var(--surface-elevated)] disabled:opacity-40"
          >
            Deploy live preview
          </button>
        </div>
      )}
    </div>
  );
}

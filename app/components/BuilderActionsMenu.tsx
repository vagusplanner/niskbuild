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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-nisk-muted">{children}</p>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
  active,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: 'default' | 'accent';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-40 ${
        active
          ? 'text-[var(--copper-melt)]'
          : tone === 'accent'
            ? 'text-[var(--copper-melt)]'
            : 'text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

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
          className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-50 py-1 overflow-hidden max-h-[min(70vh,520px)] overflow-y-auto"
        >
          <SectionLabel>View</SectionLabel>
          {onOpenInspector && (
            <MenuItem
              active={inspectorOpen}
              onClick={() => {
                onOpenInspector();
                close();
              }}
            >
              {inspectorOpen ? 'Hide inspector' : 'Show inspector'}
            </MenuItem>
          )}
          {onToggleFullscreen && (
            <MenuItem
              onClick={() => {
                onToggleFullscreen();
                close();
              }}
            >
              Fullscreen preview
            </MenuItem>
          )}
          {onPreviewDeviceChange && (
            <>
              <p className="px-4 pt-1 pb-0.5 text-[10px] text-nisk-muted">Preview size</p>
              {PREVIEW_DEVICE_OPTIONS.map(({ id, label, Icon }) => (
                <MenuItem
                  key={id}
                  active={previewDevice === id}
                  onClick={() => {
                    onPreviewDeviceChange(id);
                    close();
                  }}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {label}
                  </span>
                </MenuItem>
              ))}
            </>
          )}

          <div className="border-t border-nisk my-1" />
          <SectionLabel>Edit</SectionLabel>
          <MenuItem
            disabled={!canVisualEdit}
            onClick={() => {
              onToggleVisualEdit();
              close();
            }}
          >
            {visualEditMode ? 'Exit visual edit' : 'Visual edit'}
          </MenuItem>
          <MenuItem
            disabled={visualEditMode}
            onClick={() => {
              onToggleInspect();
              close();
            }}
          >
            {inspectMode ? 'Exit target mode' : 'Target element'}
          </MenuItem>
          {onOpenHistory && (
            <MenuItem
              active={versionHistoryOpen}
              onClick={() => {
                onOpenHistory();
                close();
              }}
            >
              Version history
            </MenuItem>
          )}

          <div className="border-t border-nisk my-1" />
          <SectionLabel>Project &amp; share</SectionLabel>
          <MenuItem
            disabled={!canAct}
            onClick={() => {
              onSave();
              close();
            }}
          >
            Save project
          </MenuItem>
          <MenuItem
            disabled={!canAct || isExporting}
            onClick={() => {
              onExportZip();
              close();
            }}
          >
            {isExporting ? 'Exporting…' : 'Export ZIP'}
          </MenuItem>
          <MenuItem
            disabled={!canAct || mobileExporting || !canPwa}
            onClick={() => {
              onMobileExport();
              close();
            }}
          >
            Export mobile app
          </MenuItem>
          <MenuItem
            onClick={() => {
              fileRef.current?.click();
            }}
          >
            Import ZIP
          </MenuItem>
          {onRunExportAudit && (
            <MenuItem
              onClick={() => {
                onRunExportAudit();
                close();
              }}
            >
              Export audit
            </MenuItem>
          )}
          {canShareSocial && onOpenSocialPublisher && (
            <MenuItem
              tone="accent"
              onClick={() => {
                onOpenSocialPublisher();
                close();
              }}
            >
              Share to Social
            </MenuItem>
          )}
          <MenuItem
            tone="accent"
            disabled={!canAct}
            onClick={() => {
              onDeployLive();
              close();
            }}
          >
            Deploy live preview
          </MenuItem>
        </div>
      )}
    </div>
  );
}

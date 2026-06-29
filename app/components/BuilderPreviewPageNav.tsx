'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectFile } from '@/lib/project-files';
import { pageDisplayLabel } from '@/lib/project-pages';

const ADD_PRESETS = [
  { id: 'contact', label: 'Contact' },
  { id: 'about', label: 'About' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'services', label: 'Services' },
  { id: 'custom', label: 'Custom page…' },
] as const;

type BuilderPreviewPageNavProps = {
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectPage: (path: string) => void;
  onAddPage?: (name: string) => void;
  onRenamePage?: (path: string, newName: string) => void;
  onDeletePage?: (path: string) => void;
  canAddPage?: boolean;
};

export default function BuilderPreviewPageNav({
  projectFiles,
  activeFile,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
  canAddPage = true,
}: BuilderPreviewPageNavProps) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const pages = projectFiles.filter((f) => /\.html?$/i.test(f.path));

  useEffect(() => {
    if (!addOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [addOpen]);

  if (pages.length === 0) return null;

  const handleAddPreset = (preset: (typeof ADD_PRESETS)[number]) => {
    setAddOpen(false);
    if (!onAddPage) return;
    if (preset.id === 'custom') {
      const name = window.prompt('New page name');
      if (name?.trim()) onAddPage(name.trim());
      return;
    }
    onAddPage(preset.label);
  };

  const handleRename = () => {
    if (!onRenamePage) return;
    const current = pageDisplayLabel(activeFile);
    const name = window.prompt('Rename page', current);
    if (name?.trim() && name.trim() !== current) {
      onRenamePage(activeFile, name.trim());
    }
  };

  const handleDelete = () => {
    if (!onDeletePage || activeFile === 'index.html') return;
    if (window.confirm(`Delete ${pageDisplayLabel(activeFile)}? This cannot be undone.`)) {
      onDeletePage(activeFile);
    }
  };

  return (
    <nav
      aria-label="App pages"
      className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--card-bg)]/90"
    >
      <label className="sr-only" htmlFor="builder-page-select">
        Page to edit
      </label>
      <select
        id="builder-page-select"
        value={activeFile}
        onChange={(e) => onSelectPage(e.target.value)}
        className="flex-1 min-w-0 max-w-[220px] px-2.5 py-1.5 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] focus:border-[var(--copper-primary)] outline-none"
      >
        {pages.map((file) => (
          <option key={file.path} value={file.path}>
            {pageDisplayLabel(file.path)}
          </option>
        ))}
      </select>

      {canAddPage && onAddPage && (
        <div ref={addRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-dashed border-[var(--copper-primary)]/50 text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/10 transition-colors flex items-center gap-1"
            aria-expanded={addOpen}
          >
            + Page
            <svg className={`w-3 h-3 transition-transform ${addOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {addOpen && (
            <div className="absolute left-0 top-full mt-1 z-[70] min-w-[160px] py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] shadow-lg">
              {ADD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--surface)]"
                  onClick={() => handleAddPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(onRenamePage || onDeletePage) && (
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {onRenamePage && (
            <button
              type="button"
              onClick={handleRename}
              className="px-2 py-1 text-[10px] rounded border border-[var(--border)] text-nisk-muted hover:text-[var(--copper-melt)]"
              title="Rename page"
            >
              Rename
            </button>
          )}
          {onDeletePage && activeFile !== 'index.html' && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 text-[10px] rounded border border-[var(--border)] text-nisk-muted hover:text-[var(--error)]"
              title="Delete page"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

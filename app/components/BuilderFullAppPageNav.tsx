'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectFile } from '@/lib/project-files';
import {
  listFullAppRoutePages,
  type FullAppRoutePage,
} from '@/lib/full-app-pages';

const ADD_PRESETS = [
  { id: 'settings', label: 'Settings' },
  { id: 'profile', label: 'Profile' },
  { id: 'about', label: 'About' },
  { id: 'custom', label: 'Custom page…' },
] as const;

type BuilderFullAppPageNavProps = {
  projectFiles: ProjectFile[];
  activeFile: string;
  onSelectPage: (page: FullAppRoutePage) => void;
  onAddPage?: (name: string) => void;
  canAddPage?: boolean;
};

/**
 * Full App route chrome — lists src/pages/* as real routes (not HTML files).
 */
export default function BuilderFullAppPageNav({
  projectFiles,
  activeFile,
  onSelectPage,
  onAddPage,
  canAddPage = true,
}: BuilderFullAppPageNavProps) {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const pages = listFullAppRoutePages(projectFiles);

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

  if (pages.length === 0) {
    return (
      <nav
        aria-label="App routes"
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--card-bg)]/90"
      >
        <span className="text-[11px] text-nisk-muted">
          No <code className="text-[10px]">src/pages/</code> routes yet — generate or add a page.
        </span>
        {canAddPage && onAddPage && (
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('New page name');
              if (name?.trim()) onAddPage(name.trim());
            }}
            className="ml-auto px-2.5 py-1.5 text-xs font-semibold rounded-md border border-dashed border-[var(--copper-primary)]/50 text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/10"
          >
            + Page
          </button>
        )}
      </nav>
    );
  }

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

  return (
    <nav
      aria-label="App routes"
      className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--card-bg)]/90"
    >
      <span className="text-[10px] uppercase tracking-wider text-nisk-muted shrink-0 hidden sm:inline">
        Routes
      </span>
      <div className="flex items-center gap-1 min-w-0 overflow-x-auto flex-1 scrollbar-thin">
        {pages.map((page) => {
          const active = page.filePath === activeFile;
          return (
            <button
              key={page.filePath}
              type="button"
              onClick={() => onSelectPage(page)}
              className={`shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                active
                  ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                  : 'border-[var(--border)] text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
              }`}
              title={`${page.routePath} → ${page.filePath}`}
            >
              {page.label}
              <span className="ml-1.5 text-[10px] font-mono opacity-60">{page.routePath}</span>
            </button>
          );
        })}
      </div>

      {canAddPage && onAddPage && (
        <div ref={addRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-dashed border-[var(--copper-primary)]/50 text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/10 transition-colors flex items-center gap-1"
            aria-expanded={addOpen}
            title="Add a React page under src/pages and wire it into the router"
          >
            + Page
            <svg
              className={`w-3 h-3 transition-transform ${addOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {addOpen && (
            <div className="absolute right-0 top-full mt-1 z-[70] min-w-[180px] py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] shadow-lg">
              <p className="px-3 py-1.5 text-[10px] text-nisk-muted border-b border-[var(--border)]">
                Adds <code>src/pages/</code> + route
              </p>
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
    </nav>
  );
}

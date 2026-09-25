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
 * Full App route chrome — dropdown of src/pages/* routes (scales with many pages).
 */
export default function BuilderFullAppPageNav({
  projectFiles,
  activeFile,
  onSelectPage,
  onAddPage,
  canAddPage = true,
}: BuilderFullAppPageNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pages = listFullAppRoutePages(projectFiles);
  const active =
    pages.find((p) => p.filePath === activeFile) ?? pages[0] ?? null;

  useEffect(() => {
    if (!menuOpen && !addOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setAddOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setAddOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, addOpen]);

  const handleAddPreset = (preset: (typeof ADD_PRESETS)[number]) => {
    setAddOpen(false);
    setMenuOpen(false);
    if (!onAddPage) return;
    if (preset.id === 'custom') {
      const name = window.prompt('New page name');
      if (name?.trim()) onAddPage(name.trim());
      return;
    }
    onAddPage(preset.label);
  };

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

  return (
    <nav
      aria-label="App routes"
      className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--card-bg)]/90"
    >
      <span className="text-[10px] uppercase tracking-wider text-nisk-muted shrink-0 hidden sm:inline">
        Route
      </span>

      <div ref={rootRef} className="relative flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            setMenuOpen((v) => !v);
            setAddOpen(false);
          }}
          className="flex items-center gap-2 min-w-0 max-w-full sm:max-w-[min(100%,320px)] px-2.5 py-1.5 text-xs font-semibold rounded-md border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/15 transition-colors"
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls="full-app-route-list"
          title="Select a route to open in the preview"
        >
          <span className="truncate">{active?.label ?? 'Select page'}</span>
          <span className="font-mono text-[10px] opacity-70 shrink-0">
            {active?.routePath ?? ''}
          </span>
          <span className="text-[10px] text-nisk-muted shrink-0 tabular-nums">
            {pages.length}
          </span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {menuOpen && (
          <ul
            id="full-app-route-list"
            role="listbox"
            aria-label="App routes"
            className="absolute left-0 top-full mt-1 z-[70] min-w-[220px] max-w-[min(100vw-2rem,360px)] max-h-64 overflow-y-auto py-1 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] shadow-lg"
          >
            {pages.map((page) => {
              const isActive = page.filePath === active?.filePath;
              return (
                <li key={page.filePath} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                        : 'text-[var(--foreground)] hover:bg-[var(--surface)]'
                    }`}
                    onClick={() => {
                      setMenuOpen(false);
                      onSelectPage(page);
                    }}
                  >
                    <span className="font-semibold truncate">{page.label}</span>
                    <span className="font-mono text-[10px] text-nisk-muted shrink-0">
                      {page.routePath}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {canAddPage && onAddPage && (
          <div className="relative shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => {
                setAddOpen((v) => !v);
                setMenuOpen(false);
              }}
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
      </div>
    </nav>
  );
}

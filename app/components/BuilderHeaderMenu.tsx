'use client';

import { useEffect, useRef, useState } from 'react';

type BuilderHeaderMenuProps = {
  onNewProject: () => void;
  onOpenProjects: () => void;
  projectCount: number;
  disabled?: boolean;
};

export default function BuilderHeaderMenu({
  onNewProject,
  onOpenProjects,
  projectCount,
  disabled = false,
}: BuilderHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border border-[var(--border)] text-nisk-muted hover:text-[var(--copper-melt)] hover:border-[var(--copper-primary)]/50 transition-colors disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Menu
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

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-[80] min-w-[180px] py-1 rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors flex items-center justify-between gap-2"
            onClick={() => pick(onOpenProjects)}
          >
            <span>My projects</span>
            {projectCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--copper-primary)]/20 text-[var(--copper-melt)]">
                {projectCount}
              </span>
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-xs text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            onClick={() => pick(onNewProject)}
          >
            + New project
          </button>
        </div>
      )}
    </div>
  );
}

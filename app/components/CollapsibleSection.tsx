"use client";

import { useState, type ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: string;
};

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-nisk/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--surface-elevated)]/50 transition-colors"
      >
        <span className="text-[10px] uppercase tracking-wider text-nisk-muted font-medium">
          {title}
        </span>
        <span className="flex items-center gap-2">
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]">
              {badge}
            </span>
          )}
          <span className="text-nisk-muted text-xs">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

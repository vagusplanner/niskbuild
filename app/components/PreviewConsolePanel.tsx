"use client";

import { useMemo, useState } from 'react';
import type { PreviewConsoleEntry, PreviewConsoleLevel } from '@/app/components/usePreviewConsole';

type FilterLevel = 'all' | PreviewConsoleLevel;

type PreviewConsolePanelProps = {
  entries: PreviewConsoleEntry[];
  onClear: () => void;
  open: boolean;
};

const FILTERS: { id: FilterLevel; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'log', label: 'Log' },
  { id: 'warn', label: 'Warn' },
  { id: 'error', label: 'Error' },
];

function levelClass(level: PreviewConsoleLevel): string {
  if (level === 'error') return 'text-red-400';
  if (level === 'warn') return 'text-amber-400';
  return 'text-nisk-muted';
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Collapsible console strip under the live preview (~140px). */
export default function PreviewConsolePanel({
  entries,
  onClear,
  open,
}: PreviewConsolePanelProps) {
  const [filter, setFilter] = useState<FilterLevel>('all');

  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.level === filter)),
    [entries, filter]
  );

  if (!open) return null;

  return (
    <div
      className="shrink-0 flex flex-col border-t border-nisk bg-[var(--code-bg)]"
      style={{ height: 140 }}
      role="region"
      aria-label="Preview console"
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-2 py-1 border-b border-nisk">
        <div className="flex gap-0.5" role="group" aria-label="Filter console by level">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors ${
                filter === id
                  ? 'bg-[var(--surface-elevated)] text-[var(--copper-melt)]'
                  : 'text-nisk-muted hover:text-[var(--foreground)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="px-2 py-0.5 text-[10px] rounded-md text-nisk-muted hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
          title="Clear console"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto font-mono text-[11px] leading-relaxed px-2 py-1">
        {visible.length === 0 ? (
          <p className="text-nisk-muted py-2">No console output</p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((entry) => (
              <li key={entry.id} className="flex gap-2 items-start">
                <span className="shrink-0 text-[var(--muted)] tabular-nums w-[4.5rem]">
                  {formatTime(entry.ts)}
                </span>
                <span
                  className={`shrink-0 uppercase w-10 font-semibold ${levelClass(entry.level)}`}
                >
                  {entry.level}
                </span>
                <span className="min-w-0 break-words text-[var(--foreground)]">
                  {entry.message || '(empty)'}
                  {entry.stack ? (
                    <pre className="mt-0.5 text-[10px] text-nisk-muted whitespace-pre-wrap break-words">
                      {entry.stack}
                    </pre>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/app/components/ThemeProvider';
import type { ThemePreference } from '@/lib/theme';

const OPTIONS: { id: ThemePreference; label: string; icon: string }[] = [
  { id: 'dark', label: 'Dark', icon: '🌙' },
  { id: 'light', label: 'Light', icon: '☀️' },
  { id: 'system', label: 'System', icon: '💻' },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const active = OPTIONS.find((o) => o.id === preference) ?? OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border border-nisk-accent text-nisk-muted hover:text-white hover:border-[var(--accent-cyan)]/60 transition-colors ${
          compact ? 'p-2' : 'px-2.5 py-1.5 text-xs'
        }`}
        title="Theme"
        aria-label="Change theme"
      >
        <span>{active.icon}</span>
        {!compact && <span className="hidden lg:inline">{active.label}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-nisk bg-nisk-card shadow-2xl z-[60] py-1 overflow-hidden">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setPreference(opt.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--surface-elevated)] ${
                preference === opt.id ? 'text-[var(--accent-cyan)]' : 'text-gray-300'
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
              {preference === opt.id && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

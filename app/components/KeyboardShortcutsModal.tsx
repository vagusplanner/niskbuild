"use client";

import { useEffect, useState } from 'react';
import { modKey, shortcut } from '@/lib/keyboard';

const SHORTCUTS = [
  { keys: [shortcut(modKey(), 'K')], label: 'Command palette' },
  { keys: [shortcut(modKey(), '↵')], label: 'Generate from prompt' },
  { keys: [shortcut(modKey(), 'S')], label: 'Save project (builder)' },
  { keys: [shortcut(modKey(), 'B')], label: 'Toggle code inspector (builder)' },
  { keys: ['F'], label: 'Fullscreen preview (builder)' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close modal / palette' },
];

function isTypingTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const mod = modKey();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-nisk bg-nisk-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="shortcuts-title"
      >
        <div className="px-5 py-4 border-b border-nisk flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-white">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-nisk-muted hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ul className="px-5 py-4 space-y-3">
          {SHORTCUTS.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-300">{item.label}</span>
              <span className="flex gap-1 shrink-0">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 rounded-md border border-nisk bg-nisk text-[11px] font-mono text-[var(--accent-cyan)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-[10px] text-nisk-muted">
          {mod === '⌘' ? 'macOS / iOS' : 'Windows / Linux'} — builder shortcuts work on the Builder page.
        </p>
      </div>
    </div>
  );
}

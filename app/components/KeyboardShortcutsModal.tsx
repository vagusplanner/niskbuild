"use client";

import { useEffect, useState } from 'react';
import { SHORTCUTS_MODAL_OPEN_EVENT } from '@/lib/command-palette-events';
import { modKey, shortcut } from '@/lib/keyboard';

const SHORTCUTS = [
  { keys: [shortcut(modKey(), 'K')], label: 'Command palette' },
  { keys: [shortcut(modKey(), 'N')], label: 'New project' },
  { keys: [shortcut(modKey(), 'E')], label: 'Export current project (builder)' },
  { keys: [shortcut(modKey(), 'S')], label: 'Save project (builder)' },
  { keys: [shortcut(modKey(), 'B')], label: 'View billing / toggle inspector (builder)' },
  { keys: [shortcut(modKey(), ',')], label: 'Open settings' },
  { keys: [shortcut(modKey(), '⇧L')], label: 'Toggle dark / light mode' },
  { keys: [shortcut(modKey(), '↵')], label: 'Generate from prompt (builder)' },
  { keys: ['F'], label: 'Fullscreen preview (builder)' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['↑', '↓'], label: 'Navigate palette results' },
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
    const onOpen = () => setOpen(true);
    window.addEventListener(SHORTCUTS_MODAL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SHORTCUTS_MODAL_OPEN_EVENT, onOpen);
  }, []);

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
        className="w-full max-w-lg rounded-2xl border border-nisk bg-nisk-card shadow-2xl overflow-hidden"
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
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {SHORTCUTS.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 min-w-0">
              <span className="text-sm text-gray-300 truncate">{item.label}</span>
              <span className="flex gap-1 shrink-0 flex-wrap justify-end">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-1 rounded-md border border-nisk bg-nisk text-[11px] font-mono text-[var(--accent-cyan)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <p className="px-5 pb-4 text-[10px] text-nisk-muted">
          {mod === '⌘' ? 'macOS / iOS' : 'Windows / Linux'} — builder shortcuts work on the Builder page.
        </p>
      </div>
    </div>
  );
}

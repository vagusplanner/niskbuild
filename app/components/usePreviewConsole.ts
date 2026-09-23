"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export type PreviewConsoleLevel = 'log' | 'warn' | 'error';

export type PreviewConsoleEntry = {
  id: number;
  level: PreviewConsoleLevel;
  message: string;
  stack?: string;
  ts: number;
};

const RING_MAX = 150;

function isConsoleLevel(v: unknown): v is PreviewConsoleLevel {
  return v === 'log' || v === 'warn' || v === 'error';
}

/**
 * Listens for niskbuild-preview-console postMessages from the preview iframe.
 * Ring buffer (~150). Clears on reload and when a new generation starts.
 */
export function usePreviewConsole(reloadKey: number, isGenerating: boolean) {
  const [entries, setEntries] = useState<PreviewConsoleEntry[]>([]);
  const nextId = useRef(1);
  const wasGenerating = useRef(false);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  useEffect(() => {
    clear();
  }, [reloadKey, clear]);

  useEffect(() => {
    if (isGenerating && !wasGenerating.current) {
      clear();
    }
    wasGenerating.current = isGenerating;
  }, [isGenerating, clear]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'niskbuild-preview-console') return;
      if (!isConsoleLevel(data.level)) return;
      const message =
        typeof data.message === 'string' ? data.message : String(data.message ?? '');
      const stack = typeof data.stack === 'string' ? data.stack : undefined;
      const ts = typeof data.ts === 'number' ? data.ts : Date.now();
      const id = nextId.current++;
      setEntries((prev) => {
        const next = [...prev, { id, level: data.level as PreviewConsoleLevel, message, stack, ts }];
        return next.length > RING_MAX ? next.slice(next.length - RING_MAX) : next;
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const errorCount = entries.reduce((n, e) => n + (e.level === 'error' ? 1 : 0), 0);
  const warnCount = entries.reduce((n, e) => n + (e.level === 'warn' ? 1 : 0), 0);

  return { entries, clear, errorCount, warnCount };
}

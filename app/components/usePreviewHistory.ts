"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

type PreviewHistoryState = {
  entries: string[];
  index: number;
  reloadKey: number;
};

/**
 * Preview-internal navigation history (not the parent browser).
 * - External previewHtml changes push (or replace tip while generating).
 * - Back/forward move within the stack without fighting the parent prop.
 */
export function usePreviewHistory(sourceHtml: string, isGenerating: boolean) {
  const [state, setState] = useState<PreviewHistoryState>(() => ({
    entries: [sourceHtml || ''],
    index: 0,
    reloadKey: 0,
  }));
  const lastSeenSource = useRef<string | null>(null);

  useEffect(() => {
    if (lastSeenSource.current === null) {
      lastSeenSource.current = sourceHtml;
      return;
    }
    if (sourceHtml === lastSeenSource.current) return;
    lastSeenSource.current = sourceHtml;

    setState((s) => {
      const cur = s.entries[s.index] ?? '';
      if (sourceHtml === cur) return s;
      if (isGenerating) {
        const entries = s.entries.slice();
        entries[s.index] = sourceHtml;
        return { ...s, entries };
      }
      const entries = [...s.entries.slice(0, s.index + 1), sourceHtml];
      return { ...s, entries, index: entries.length - 1 };
    });
  }, [sourceHtml, isGenerating]);

  const displayHtml = state.entries[state.index] ?? sourceHtml;
  const canGoBack = state.index > 0;
  const canGoForward = state.index < state.entries.length - 1;

  const goBack = useCallback(() => {
    setState((s) => (s.index > 0 ? { ...s, index: s.index - 1 } : s));
  }, []);

  const goForward = useCallback(() => {
    setState((s) =>
      s.index < s.entries.length - 1 ? { ...s, index: s.index + 1 } : s
    );
  }, []);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, reloadKey: s.reloadKey + 1 }));
  }, []);

  return {
    displayHtml,
    reloadKey: state.reloadKey,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    reload,
  };
}

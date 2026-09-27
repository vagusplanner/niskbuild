'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

/**
 * Request hostname from the server layout (via `headers()`).
 * Fixes SSR of client nav links: without this, `shiftAiAppPath()` sees no
 * `window` during SSR and emits `/builder/shift-ai/...` on supereduc8.com,
 * which hydrates poorly and leaks internal paths in the DOM.
 */
const ShiftAiHostnameContext = createContext<string>('');

export function ShiftAiHostnameProvider({
  hostname,
  children,
}: {
  hostname: string;
  children: ReactNode;
}) {
  const normalized = hostname.split(':')[0]?.trim().toLowerCase() || '';
  return (
    <ShiftAiHostnameContext.Provider value={normalized}>
      {children}
    </ShiftAiHostnameContext.Provider>
  );
}

export function useShiftAiHostname(): string {
  const fromCtx = useContext(ShiftAiHostnameContext);
  if (fromCtx) return fromCtx;
  if (typeof window !== 'undefined') {
    return window.location.hostname.toLowerCase();
  }
  return '';
}

/** Host-aware in-app href for client components. */
export function useShiftAiAppPath(subpath: string): string {
  const hostname = useShiftAiHostname();
  return useMemo(() => shiftAiAppPath(subpath, hostname), [subpath, hostname]);
}

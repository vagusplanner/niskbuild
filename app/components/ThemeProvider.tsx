"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light';
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyLightTheme() {
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
}

/** Brand uses forged iron & melted copper palette — single theme across the app. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('light');

  useEffect(() => {
    applyLightTheme();
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setPreferenceState('light');
  }, []);

  const setPreference = useCallback((_pref: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    setPreferenceState('light');
    applyLightTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, resolved: 'light', setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: 'light' as ThemePreference,
      resolved: 'light' as const,
      setPreference: () => {},
    };
  }
  return ctx;
}

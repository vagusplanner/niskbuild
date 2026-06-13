export type ThemePreference = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'niskbuild-theme';

export function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref === 'light' ? 'light' : 'dark';
}

export function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'dark';
}

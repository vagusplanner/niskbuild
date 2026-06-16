export type ThemePreference = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'niskbuild-theme';

export function resolveTheme(_pref: ThemePreference): 'light' {
  return 'light';
}

export function getStoredTheme(): ThemePreference {
  return 'light';
}

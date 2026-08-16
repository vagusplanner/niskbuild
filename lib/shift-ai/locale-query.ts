import {
  isShiftStudyLanguage,
  type ShiftStudyLanguage,
} from '@/lib/shift-ai/constants';

/** Forwarded by proxy from `?lang=` on unauthenticated Shift AI routes. */
export const SHIFT_AI_LANG_HEADER = 'x-shift-ai-lang';

export function isUnauthenticatedLocaleOverridePath(pathname: string): boolean {
  if (pathname === '/builder/shift-ai/signup' || pathname.startsWith('/builder/shift-ai/signup/')) {
    return true;
  }
  return pathname.startsWith('/builder/shift-ai/parent/consent');
}

export function parseLangQueryParam(value: string | null | undefined): ShiftStudyLanguage | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return isShiftStudyLanguage(normalized) ? normalized : null;
}

export function withLangQuery(path: string, lang: string | null | undefined): string {
  const parsed = parseLangQueryParam(lang);
  if (!parsed) return path;
  const url = new URL(path, 'https://niskbuild.invalid');
  url.searchParams.set('lang', parsed);
  return `${url.pathname}${url.search}`;
}

/** Consent email links only add `lang` when Arabic so English stays the default URL. */
export function parentalConsentPath(token: string, lang: ShiftStudyLanguage): string {
  const path = `/builder/shift-ai/parent/consent/${encodeURIComponent(token)}`;
  return lang === 'ar' ? `${path}?lang=ar` : path;
}

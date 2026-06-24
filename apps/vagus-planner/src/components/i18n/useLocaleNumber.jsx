/**
 * Hook to format numbers and times in the user's selected locale.
 * Arabic/Urdu use Eastern Arabic-Indic numerals natively.
 */
import { useMemo } from 'react';

const LOCALE_MAP = {
  en: 'en-US',
  ar: 'ar-SA',
  fr: 'fr-FR',
  tr: 'tr-TR',
  ur: 'ur-PK',
};

export function useLocaleNumber() {
  const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('vagus_language') || 'en') : 'en';
  const locale = LOCALE_MAP[lang] || 'en-US';

  const fmt = useMemo(() => ({
    /** Format an integer / float */
    n: (num) => typeof num === 'number' ? num.toLocaleString(locale) : num,
    /** Format a percentage (0–100) */
    pct: (num) => typeof num === 'number' ? `${num.toLocaleString(locale)}%` : `${num}%`,
    /** Format a time string "HH:MM" → locale time */
    time: (timeStr) => {
      if (!timeStr) return timeStr;
      try {
        const [h, m] = timeStr.split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      } catch { return timeStr; }
    },
    /** Format a Date object to locale date string */
    date: (dateObj, opts) => {
      if (!dateObj) return '';
      try { return dateObj.toLocaleDateString(locale, opts); } catch { return dateObj.toString(); }
    },
    locale,
  }), [lang]);

  return fmt;
}
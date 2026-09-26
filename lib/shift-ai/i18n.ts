import type { AbstractIntlMessages } from 'next-intl';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';
import ar from '@/messages/shift-ai/ar.json';
import en from '@/messages/shift-ai/en.json';

/** UI catalogs: FR/ES fall back to English until full UI translations ship. */
const CATALOGS: Partial<Record<ShiftStudyLanguage, typeof en>> = {
  en,
  ar,
  fr: en,
  es: en,
};

export function shiftAiCatalog(locale: ShiftStudyLanguage): typeof en {
  return CATALOGS[locale] ?? CATALOGS.en!;
}

export function getShiftAiMessages(locale: ShiftStudyLanguage): AbstractIntlMessages {
  return shiftAiCatalog(locale);
}

export function shiftAiTextDirection(locale: ShiftStudyLanguage): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

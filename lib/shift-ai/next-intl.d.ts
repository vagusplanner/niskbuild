import type en from '@/messages/shift-ai/en.json';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';

declare module 'next-intl' {
  interface AppConfig {
    Locale: ShiftStudyLanguage;
    Messages: typeof en;
  }
}

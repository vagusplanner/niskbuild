import type { Metadata } from 'next';
import { Amiri, Noto_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import ShiftAiLayoutGate from '@/app/builder/shift-ai/ShiftAiLayoutGate';
import { getShiftAiMessages, shiftAiTextDirection } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import './shift-ai.css';

export const metadata: Metadata = {
  title: {
    default: 'Shift Learning',
    template: '%s · Shift Learning',
  },
  robots: 'noindex',
};

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sa-arabic-sans',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-sa-arabic-serif',
  display: 'swap',
});

export default async function ShiftAiLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestStudyLanguage();
  const messages = getShiftAiMessages(locale);
  const dir = shiftAiTextDirection(locale);

  return (
    <div className={`${notoSansArabic.variable} ${amiri.variable}`}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <ShiftAiLayoutGate dir={dir} locale={locale}>
          {children}
        </ShiftAiLayoutGate>
      </NextIntlClientProvider>
    </div>
  );
}

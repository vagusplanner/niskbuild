import type { Metadata } from 'next';
import { Amiri, Noto_Sans_Arabic } from 'next/font/google';
import ShiftAiIntlProvider from '@/app/builder/shift-ai/ShiftAiIntlProvider';
import ShiftAiLayoutGate from '@/app/builder/shift-ai/ShiftAiLayoutGate';
import { getShiftAiMessages, shiftAiTextDirection } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import './shift-ai.css';

export const metadata: Metadata = {
  title: {
    default: 'SuperEduc8',
    template: '%s · SuperEduc8',
  },
  description: 'SuperEduc8 — AI study companion for students.',
  robots: 'noindex',
  icons: {
    icon: [
      { url: '/brand/supereduc8/favicon.ico', sizes: 'any' },
      { url: '/brand/supereduc8/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/supereduc8/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/brand/supereduc8/apple-touch-icon.png', sizes: '180x180' }],
  },
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
      <ShiftAiIntlProvider locale={locale} messages={messages}>
        <ShiftAiLayoutGate dir={dir} locale={locale}>
          {children}
        </ShiftAiLayoutGate>
      </ShiftAiIntlProvider>
    </div>
  );
}

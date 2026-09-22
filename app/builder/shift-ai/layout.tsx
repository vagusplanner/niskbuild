import type { Metadata } from 'next';
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

/**
 * Arabic fonts via Google Fonts CSS (not next/font/google).
 *
 * next/font + Turbopack fails intermittently for large multi-unicode-range
 * families like Noto Sans Arabic with:
 *   Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
 * That blocked production deploys. CDN stylesheet avoids Turbopack's font
 * virtual-module path entirely while keeping the same typefaces.
 */
const ARABIC_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap';

export default async function ShiftAiLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestStudyLanguage();
  const messages = getShiftAiMessages(locale);
  const dir = shiftAiTextDirection(locale);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={ARABIC_FONTS_HREF} />
      <div className="sa-arabic-font-scope">
        <ShiftAiIntlProvider locale={locale} messages={messages}>
          <ShiftAiLayoutGate dir={dir} locale={locale}>
            {children}
          </ShiftAiLayoutGate>
        </ShiftAiIntlProvider>
      </div>
    </>
  );
}

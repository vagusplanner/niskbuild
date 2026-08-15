'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';

/**
 * Client-only wrapper. Importing NextIntlClientProvider from a Server
 * Component uses NextIntlClientProviderServer, which loads `next-intl/config`
 * (i18n/request.ts via the plugin). We deliberately skip that plugin so the
 * rest of NiskBuild is untouched — this client import uses the provider that
 * only needs locale + messages.
 */
export default function ShiftAiIntlProvider({
  locale,
  messages,
  children,
}: {
  locale: ShiftStudyLanguage;
  messages: AbstractIntlMessages;
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

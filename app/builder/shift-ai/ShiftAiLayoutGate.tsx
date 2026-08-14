'use client';

import { usePathname } from 'next/navigation';
import ShiftAiShell from '@/app/builder/shift-ai/ShiftAiShell';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';

const STANDALONE_PREFIXES = [
  '/builder/shift-ai/studio',
  '/builder/shift-ai/parent',
  '/builder/shift-ai/mentor',
  '/builder/shift-ai/signup',
  '/builder/shift-ai/login',
  '/builder/shift-ai/onboarding',
];

function isStandaloneRoute(pathname: string): boolean {
  return STANDALONE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function ShiftAiLayoutGate({
  children,
  dir,
  locale,
}: {
  children: React.ReactNode;
  dir: 'ltr' | 'rtl';
  locale: ShiftStudyLanguage;
}) {
  const pathname = usePathname() ?? '';

  if (isStandaloneRoute(pathname)) {
    return (
      <div className="shift-ai-app shift-ai-standalone" dir={dir} lang={locale}>
        {children}
      </div>
    );
  }

  return (
    <ShiftAiShell dir={dir} locale={locale}>
      {children}
    </ShiftAiShell>
  );
}

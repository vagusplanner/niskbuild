'use client';

import { usePathname } from 'next/navigation';
import ShiftAiShell from '@/app/builder/shift-ai/ShiftAiShell';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';
import { shiftAiPublicPathname } from '@/lib/supereduc8-host';

/** Internal + public (SuperEduc8 clean URL) prefixes that skip app chrome. */
const STANDALONE_PUBLIC_PREFIXES = [
  '/signup',
  '/login',
  '/onboarding',
  '/parent',
  '/mentor',
  '/studio',
] as const;

function isStandaloneRoute(pathname: string): boolean {
  const publicPath = shiftAiPublicPathname(pathname);
  return STANDALONE_PUBLIC_PREFIXES.some(
    (prefix) => publicPath === prefix || publicPath.startsWith(`${prefix}/`)
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

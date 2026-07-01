'use client';

import { usePathname } from 'next/navigation';
import ShiftAiShell from '@/app/builder/shift-ai/ShiftAiShell';

const STANDALONE_PREFIXES = [
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

export default function ShiftAiLayoutGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (isStandaloneRoute(pathname)) {
    return <div className="shift-ai-app shift-ai-standalone">{children}</div>;
  }

  return <ShiftAiShell>{children}</ShiftAiShell>;
}

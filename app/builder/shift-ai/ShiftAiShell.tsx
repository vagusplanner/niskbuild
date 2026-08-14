'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCap, Menu, X } from 'lucide-react';
import ShiftAiSidebar from '@/app/builder/shift-ai/ShiftAiSidebar';
import type { ShiftStudyLanguage } from '@/lib/shift-ai/constants';

export default function ShiftAiShell({
  children,
  dir,
  locale,
}: {
  children: React.ReactNode;
  dir: 'ltr' | 'rtl';
  locale: ShiftStudyLanguage;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tBrand = useTranslations('brand');
  const tSidebar = useTranslations('sidebar');

  return (
    <div className="shift-ai-app flex h-screen overflow-hidden" dir={dir} lang={locale}>
      <div className="hidden flex-shrink-0 md:flex">
        <ShiftAiSidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="relative flex-shrink-0">
            <ShiftAiSidebar onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute end-3 top-4 rounded-md bg-white/10 p-1.5 text-white hover:bg-white/20"
              aria-label={tSidebar('closeMenu')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label={tSidebar('closeMenuOverlay')}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--sa-border)] bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 hover:bg-[var(--sa-secondary)]"
              aria-label={tSidebar('openMenu')}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sa-navy-800)]">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-[var(--sa-navy-800)]">{tBrand('name')}</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type StudioCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  primary?: boolean;
};

function StudioCardLink({ card }: { card: StudioCard }) {
  const t = useTranslations('studio');
  return (
    <article className="flex h-full flex-col gap-4 rounded-xl border border-nisk bg-nisk-card p-5">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-nisk bg-[var(--surface-elevated)] text-2xl"
          aria-hidden
        >
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">{card.title}</h3>
          <p className="text-sm leading-relaxed text-nisk-muted">{card.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-1">
        <Link
          href={card.href}
          className={
            card.primary
              ? 'inline-block rounded-lg px-3 py-1.5 text-xs no-underline btn-primary'
              : 'inline-block rounded-lg bg-[var(--primary)]/20 px-3 py-1.5 text-xs no-underline'
          }
        >
          {t('open')}
        </Link>
      </div>
    </article>
  );
}

export default function ShiftAiStudioClient() {
  const t = useTranslations('studio');

  const cards: StudioCard[] = [
    {
      id: 'live-app',
      title: t('liveTitle'),
      description: t('liveDesc'),
      href: '/builder/shift-ai',
      icon: '🎓',
      primary: true,
    },
    {
      id: 'curriculum-packs',
      title: t('packsTitle'),
      description: t('packsDesc'),
      href: '/admin/shift-ai/curriculum-packs',
      icon: '📚',
    },
    {
      id: 'analytics',
      title: t('analyticsTitle'),
      description: t('analyticsDesc'),
      href: '/builder/shift-ai/analytics',
      icon: '📈',
    },
    {
      id: 'teacher-tools',
      title: t('teacherTitle'),
      description: t('teacherDesc'),
      href: '/builder/shift-ai/teacher',
      icon: '👩‍🏫',
    },
  ];

  return (
    <AdminPlatformShell
      title={`🎓 ${t('title')}`}
      description={t('description')}
      stats={[
        { label: t('statSurfaces'), value: cards.length },
        { label: t('statPhase'), value: '1', hint: t('statPhaseHint') },
        { label: t('statLiveApp'), value: t('statLiveValue') },
        { label: t('statCodeDeploy'), value: t('statCodeValue'), hint: t('statCodeHint') },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin/apps"
          className="inline-flex items-center gap-1 rounded-lg border border-nisk px-4 py-2 text-sm no-underline hover:bg-[var(--surface-elevated)]"
        >
          <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          {t('allApps')}
        </Link>
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-[var(--foreground)]">{t('quickAccess')}</h2>
        <p className="mb-4 text-sm text-nisk-muted">{t('quickAccessHint')}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <StudioCardLink key={card.id} card={card} />
          ))}
        </div>
      </section>

      <p className="mt-8 border-t border-nisk pt-4 text-xs text-nisk-muted">{t('phase2Note')}</p>
    </AdminPlatformShell>
  );
}

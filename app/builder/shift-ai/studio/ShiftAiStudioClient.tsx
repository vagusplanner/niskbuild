'use client';

import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type StudioCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  primary?: boolean;
};

const STUDIO_CARDS: StudioCard[] = [
  {
    id: 'live-app',
    title: 'Open live app',
    description:
      'Student-facing Shift AI product — dashboard, tutoring, homework, flashcards, and more.',
    href: '/builder/shift-ai',
    icon: '🎓',
    primary: true,
  },
  {
    id: 'curriculum-packs',
    title: 'Curriculum packs',
    description:
      'Create, edit, and publish curriculum content for UK, France, and US year groups.',
    href: '/admin/shift-ai/curriculum-packs',
    icon: '📚',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description:
      'In-app learning analytics — study time, subject breakdown, and progress snapshots.',
    href: '/builder/shift-ai/analytics',
    icon: '📈',
  },
  {
    id: 'teacher-tools',
    title: 'Teacher tools',
    description:
      'Teacher dashboard for school-linked accounts — view and manage linked students.',
    href: '/builder/shift-ai/teacher',
    icon: '👩‍🏫',
  },
];

function StudioCardLink({ card }: { card: StudioCard }) {
  return (
    <article className="bg-nisk-card border border-nisk rounded-xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl bg-[var(--surface-elevated)] border border-nisk flex items-center justify-center text-2xl shrink-0"
          aria-hidden
        >
          {card.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{card.title}</h3>
          <p className="text-sm text-nisk-muted leading-relaxed">{card.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-1">
        <Link
          href={card.href}
          className={
            card.primary
              ? 'inline-block px-3 py-1.5 rounded-lg btn-primary text-xs no-underline'
              : 'inline-block px-3 py-1.5 rounded-lg bg-[var(--primary)]/20 text-xs no-underline'
          }
        >
          Open
        </Link>
      </div>
    </article>
  );
}

export default function ShiftAiStudioClient() {
  return (
    <AdminPlatformShell
      title="🎓 Shift AI Studio"
      description="Platform-owner hub for Shift AI — live app, content, analytics, and teacher tools"
      stats={[
        { label: 'Surfaces', value: STUDIO_CARDS.length },
        { label: 'Phase', value: '1', hint: 'Navigation shell only — no AI code editing yet' },
        { label: 'Live app', value: 'Live' },
        { label: 'Code deploy', value: 'Vercel', hint: 'UI changes ship with main NiskBuild deploy' },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin/apps"
          className="px-4 py-2 rounded-lg border border-nisk text-sm no-underline hover:bg-[var(--surface-elevated)]"
        >
          ← All apps
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Quick access</h2>
        <p className="text-sm text-nisk-muted mb-4">
          Consolidated entry points for Shift AI admin and product surfaces.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDIO_CARDS.map((card) => (
            <StudioCardLink key={card.id} card={card} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-nisk-muted border-t border-nisk pt-4">
        Phase 2 will add AI-assisted UI editing. Content changes publish via Curriculum packs without
        a code redeploy.
      </p>
    </AdminPlatformShell>
  );
}

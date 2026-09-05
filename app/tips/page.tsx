import { redirect } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/app/components/Layout';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import {
  TIP_SECTIONS,
  TIPS,
  getTipOfDay,
  tipsBySection,
  type TipCard,
} from '@/lib/tips/tips-data';

export const metadata = {
  title: 'Tips · NiskBuild',
  description: 'Short, practical tips for building and shipping with NiskBuild.',
};

function TipCardView({ tip, featured = false }: { tip: TipCard; featured?: boolean }) {
  return (
    <article
      className={
        featured
          ? 'rounded-2xl border border-[var(--copper-primary)]/40 bg-[var(--card-bg)] p-6 shadow-[4px_4px_0_var(--copper-glow)]'
          : 'rounded-xl border border-nisk bg-[var(--surface)]/40 p-5 hover:border-[var(--copper-primary)]/35 transition-colors'
      }
    >
      <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-2">
        {featured ? 'Tip of the day' : TIP_SECTIONS.find((s) => s.id === tip.section)?.label}
      </p>
      <h3
        className={
          featured
            ? 'text-xl font-semibold text-[var(--foreground)] mb-3'
            : 'text-base font-semibold text-[var(--foreground)] mb-2'
        }
      >
        {tip.title}
      </h3>
      <dl className="space-y-2 text-sm text-nisk-muted leading-relaxed">
        <div>
          <dt className="inline font-medium text-[var(--foreground)]/80">When · </dt>
          <dd className="inline">{tip.when}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]/80">Why · </dt>
          <dd className="inline">{tip.why}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-[var(--foreground)]/80">How · </dt>
          <dd className="inline">{tip.how}</dd>
        </div>
      </dl>
      <Link
        href={tip.href}
        className="inline-flex mt-4 text-sm font-medium text-[var(--copper-melt)] hover:underline"
      >
        {tip.hrefLabel} →
      </Link>
    </article>
  );
}

export default async function TipsPage() {
  const { user } = await getAuthenticatedProfile();
  if (!user) redirect('/login?next=/tips');

  const tipOfDay = getTipOfDay();

  return (
    <Layout>
      <div className="py-8 max-w-5xl mx-auto px-4">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-nisk-muted mb-2">NiskBuild Tips</p>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Quick tips</h1>
          <p className="text-nisk-muted leading-relaxed max-w-2xl">
            Bite-sized how-tos for stable product features. For long guides, use{' '}
            <Link href="/docs" className="text-[var(--copper-melt)] hover:underline">
              Docs
            </Link>
            — Tips deep-link into the same places, not a second documentation system.
          </p>
        </header>

        <section className="mb-12">
          <TipCardView tip={tipOfDay} featured />
        </section>

        <nav className="flex flex-wrap gap-2 mb-10" aria-label="Tip sections">
          {TIP_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-nisk text-nisk-muted hover:text-[var(--foreground)] hover:border-[var(--copper-primary)]/40 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          {TIP_SECTIONS.map((section) => {
            const cards = tipsBySection(section.id);
            if (cards.length === 0) return null;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.label}</h2>
                  <p className="text-sm text-nisk-muted">{section.blurb}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cards.map((tip) => (
                    <TipCardView key={tip.id} tip={tip} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-12 text-xs text-nisk-muted">
          {TIPS.length} tips · Prefer Docs for full walkthroughs ·{' '}
          <Link href="/dashboard/support" className="hover:underline text-[var(--copper-melt)]">
            Contact support
          </Link>
        </p>
      </div>
    </Layout>
  );
}

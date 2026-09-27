'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  SE8_TIPS,
  SE8_TIP_SECTIONS,
  getSe8TipOfDay,
  searchSe8Tips,
  se8TipsBySection,
  type Se8TipCard,
} from '@/lib/shift-ai/tips-data';
import { SA } from '@/lib/shift-ai/theme';
import { useShiftAiAppPath } from '@/lib/shift-ai/host-context';

function TipCardView({ tip, featured = false }: { tip: Se8TipCard; featured?: boolean }) {
  const href = useShiftAiAppPath(tip.subpath);
  const sectionLabel = SE8_TIP_SECTIONS.find((s) => s.id === tip.section)?.label;

  return (
    <article
      className={
        featured
          ? `${SA.cardPadded} border-2 border-[var(--sa-coral)]/40`
          : `${SA.cardPadded} border border-[var(--sa-navy-100)]`
      }
    >
      <p className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${SA.muted}`}>
        {featured ? 'Tip of the day' : sectionLabel}
      </p>
      <h3 className={`mb-2 font-semibold ${featured ? 'text-lg' : 'text-base'} ${SA.text}`}>
        {tip.title}
      </h3>
      <dl className={`space-y-2 text-sm leading-relaxed ${SA.muted}`}>
        <div>
          <dt className={`inline font-medium ${SA.text}`}>When · </dt>
          <dd className="inline">{tip.when}</dd>
        </div>
        <div>
          <dt className={`inline font-medium ${SA.text}`}>Why · </dt>
          <dd className="inline">{tip.why}</dd>
        </div>
        <div>
          <dt className={`inline font-medium ${SA.text}`}>How · </dt>
          <dd className="inline">{tip.how}</dd>
        </div>
      </dl>
      <Link href={href} className={`${SA.link} mt-4 inline-flex text-sm font-semibold`}>
        {tip.hrefLabel} →
      </Link>
    </article>
  );
}

export default function ShiftAiTipsClient() {
  const [query, setQuery] = useState('');
  const tipOfDay = useMemo(() => getSe8TipOfDay(), []);
  const searchHits = useMemo(
    () => (query.trim().length >= 2 ? searchSe8Tips(query, 12) : []),
    [query]
  );
  const searching = query.trim().length >= 2;

  return (
    <div className={`${SA.contentNarrow} max-w-5xl`}>
      <header className="mb-8">
        <p className={`text-xs font-semibold uppercase tracking-wider ${SA.muted}`}>
          SuperEduc8 Tips
        </p>
        <h1 className={SA.heading}>Tips &amp; Help</h1>
        <p className={`mt-2 max-w-2xl text-sm leading-relaxed ${SA.muted}`}>
          Short how-tos for features that ship today. Each card deep-links into the real screen —
          Billing, Settings, Tutor, and more. This is not NiskBuild Tips.
        </p>
      </header>

      <label className="relative mb-8 block">
        <span className="sr-only">Search tips</span>
        <Search
          className={`pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 ${SA.muted}`}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tips (trial, flashcards, cancel…)"
          className={`${SA.input} ps-10`}
          data-testid="se8-tips-search"
        />
      </label>

      {searching ? (
        <section className="mb-10" aria-live="polite">
          <h2 className={`mb-3 font-semibold ${SA.text}`}>
            Search results ({searchHits.length})
          </h2>
          {searchHits.length === 0 ? (
            <p className={`text-sm ${SA.muted}`}>No tips matched. Try “trial”, “parent”, or “password”.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {searchHits.map((tip) => (
                <TipCardView key={tip.id} tip={tip} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="mb-10">
            <TipCardView tip={tipOfDay} featured />
          </section>

          <nav
            className="mb-8 flex max-w-full flex-wrap gap-2"
            aria-label="Tip sections"
          >
            {SE8_TIP_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 whitespace-nowrap rounded-xl border border-[var(--sa-navy-100)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--sa-navy-800)]"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="space-y-12">
            {SE8_TIP_SECTIONS.map((section) => {
              const cards = se8TipsBySection(section.id);
              if (cards.length === 0) return null;
              return (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <div className="mb-4">
                    <h2 className={`text-lg font-semibold ${SA.text}`}>{section.label}</h2>
                    <p className={`text-sm ${SA.muted}`}>{section.blurb}</p>
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
        </>
      )}

      <p className={`mt-12 text-center text-xs ${SA.muted}`}>
        {SE8_TIPS.length} tips · Grounded in shipped SuperEduc8 flows only
      </p>
    </div>
  );
}

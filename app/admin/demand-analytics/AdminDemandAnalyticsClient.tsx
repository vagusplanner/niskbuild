'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { DemandAnalyticsDashboard, DemandGranularity } from '@/lib/prompt-category-stats-types';
import type { CohortCount } from '@/lib/cohort-threshold';

const GRANULARITIES: { id: DemandGranularity; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
];

function formatCount(count: CohortCount, threshold: number): string {
  if (count === 'insufficient_data') return `Insufficient data (<${threshold})`;
  return String(count);
}

function CountCell({
  count,
  threshold,
}: {
  count: CohortCount;
  threshold: number;
}) {
  if (count === 'insufficient_data') {
    return (
      <span className="text-nisk-muted text-xs italic">
        Insufficient data (&lt;{threshold})
      </span>
    );
  }
  return <span className="font-medium text-[var(--foreground)]">{count}</span>;
}

export default function AdminDemandAnalyticsClient() {
  const [granularity, setGranularity] = useState<DemandGranularity>('month');
  const [data, setData] = useState<DemandAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/demand-analytics?granularity=${granularity}`, { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json as DemandAnalyticsDashboard);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [granularity]);

  const threshold = data?.minCohortThreshold ?? 20;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper-melt)] mb-2">
            Internal only
          </p>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Prompt category trends</h1>
          <p className="text-nisk-muted mt-1 text-sm max-w-2xl">
            Aggregate prompt demand from{' '}
            <code className="text-[var(--copper-melt)]">prompt_category_stats</code>. No user IDs,
            no prompt text. Platform owners only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/analytics"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)]"
          >
            Existing demand analytics
          </Link>
          <Link
            href="/admin"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)]"
          >
            Admin home
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {GRANULARITIES.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGranularity(g.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              granularity === g.id
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-nisk text-nisk-muted hover:text-[var(--foreground)]'
            }`}
          >
            {g.label}
          </button>
        ))}
        {data?.rangeLabel && (
          <span className="text-xs text-nisk-muted self-center ml-1">{data.rangeLabel}</span>
        )}
      </div>

      <p className="text-xs text-nisk-muted mb-6 max-w-3xl leading-relaxed border border-nisk rounded-lg px-3 py-2.5 bg-[var(--surface)]/40">
        Every breakdown applies a minimum cohort of <strong>{threshold}</strong> via{' '}
        <code className="text-[var(--copper-melt)]">applyCohortThreshold</code>. Cohorts below that
        show &ldquo;insufficient data&rdquo; — never the raw count.
      </p>

      {loading && <p className="text-nisk-muted">Loading…</p>}
      {error && (
        <p className="text-[var(--error)] text-sm">
          {error.includes('prompt_category_stats') || error.includes('does not exist')
            ? `${error} — run supabase/prompt-category-stats-migration.sql in the SQL editor.`
            : error}
        </p>
      )}

      {!loading && !error && data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-nisk-card border border-nisk rounded-xl p-5">
              <p className="text-xs text-nisk-muted uppercase tracking-wider mb-1">Total builds</p>
              <p className="text-2xl font-bold text-[var(--nisk-color)]">
                {formatCount(data.totalBuilds, threshold)}
              </p>
            </div>
            <div className="bg-nisk-card border border-nisk rounded-xl p-5">
              <p className="text-xs text-nisk-muted uppercase tracking-wider mb-1">Top category</p>
              <p className="text-2xl font-bold text-[var(--nisk-color)]">
                {data.topCategories[0] && !data.topCategories[0].suppressed
                  ? data.topCategories[0].label
                  : '—'}
              </p>
              {data.topCategories[0] && (
                <p className="text-xs text-nisk-muted mt-1">
                  <CountCell count={data.topCategories[0].count} threshold={threshold} />
                </p>
              )}
            </div>
          </div>

          <BreakdownTable
            title="Top categories"
            empty="No category cohorts in range"
            headers={['Category', 'Builds']}
            rows={data.topCategories.map((r) => [
              r.label,
              <CountCell key={`${r.category}-c`} count={r.count} threshold={threshold} />,
            ])}
          />

          <BreakdownTable
            title={`Trend by ${granularity}`}
            empty="No period cohorts in range"
            headers={['Period', 'Builds']}
            rows={data.trend.map((r) => [
              r.label,
              <CountCell key={`${r.period}-c`} count={r.count} threshold={threshold} />,
            ])}
          />

          <BreakdownTable
            title="By region"
            empty="No regional cohorts (users need analytics_region set)"
            headers={['Region', 'Builds']}
            rows={data.byRegion.map((r) => [
              r.region,
              <CountCell key={`${r.region}-c`} count={r.count} threshold={threshold} />,
            ])}
          />

          <BreakdownTable
            title="By age range"
            empty="No age cohorts (users need age_range set)"
            headers={['Age range', 'Builds']}
            rows={data.byAgeRange.map((r) => [
              r.label,
              <CountCell key={`${r.ageRange}-c`} count={r.count} threshold={threshold} />,
            ])}
          />

          <BreakdownTable
            title="Category × region"
            empty="No cross-tab cohorts meeting threshold dimensions"
            headers={['Category', 'Region', 'Builds']}
            rows={data.byCategoryAndRegion.map((r) => [
              r.categoryLabel,
              r.region,
              <CountCell
                key={`${r.category}-${r.region}`}
                count={r.count}
                threshold={threshold}
              />,
            ])}
          />

          <BreakdownTable
            title="Category × age"
            empty="No cross-tab cohorts meeting threshold dimensions"
            headers={['Category', 'Age', 'Builds']}
            rows={data.byCategoryAndAge.map((r) => [
              r.categoryLabel,
              r.ageLabel,
              <CountCell
                key={`${r.category}-${r.ageRange}`}
                count={r.count}
                threshold={threshold}
              />,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string;
  empty: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <section className="bg-nisk-card border border-nisk rounded-xl p-5 overflow-x-auto">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-nisk-muted py-4 text-center">{empty}</p>
      ) : (
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-nisk text-xs text-nisk-muted uppercase tracking-wider">
              {headers.map((h) => (
                <th key={h} className="py-2 pr-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} className="border-b border-nisk/60 last:border-0">
                {cells.map((cell, j) => (
                  <td key={j} className="py-2.5 pr-3 text-[var(--nisk-color)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

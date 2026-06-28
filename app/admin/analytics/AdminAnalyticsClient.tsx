'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsDashboardData, AnalyticsRange } from '@/lib/analytics-dashboard';
import { BRAND_COLORS } from '@/lib/brand-colors';

const RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const CHART = {
  copper: BRAND_COLORS.copperPrimary,
  melt: BRAND_COLORS.copperMelt,
  parchment: BRAND_COLORS.parchment,
  grid: 'rgba(184, 115, 51, 0.12)',
  axis: BRAND_COLORS.parchmentMuted,
  tooltipBg: BRAND_COLORS.codeBg,
  tooltipBorder: 'rgba(184, 115, 51, 0.35)',
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        background: CHART.tooltipBg,
        borderColor: CHART.tooltipBorder,
        color: CHART.parchment,
      }}
    >
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminAnalyticsClient() {
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?range=${range}`, { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
        setData(json as AnalyticsDashboardData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [range]);

  const categoryChartData =
    data?.buildsByCategory.map((c) => ({
      name: `${c.icon} ${c.label}`,
      builds: c.count,
    })) ?? [];

  const regionChartData = data?.buildsByRegion.slice(0, 12) ?? [];

  const ageRangeChartData =
    data?.buildsByAgeRange.map((row) => ({
      name: row.label,
      builds: row.count,
    })) ?? [];

  const ageCategoryChartData =
    data?.buildsByAgeAndCategory.slice(0, 15).map((row) => ({
      name: `${row.ageLabel} · ${row.categoryIcon} ${row.categoryLabel}`,
      builds: row.count,
    })) ?? [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Demand Analytics</h1>
          <p className="text-nisk-muted mt-1 text-sm max-w-2xl">
            Aggregate, anonymized demand trends from <code className="text-[var(--copper-melt)]">usage_events</code>
            . No user IDs, raw prompts, or precise geolocation — safe for market intelligence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/layer-overview"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)]"
          >
            Layer overview
          </Link>
          <Link
            href="/admin/insights"
            className="px-3 py-1.5 text-xs rounded-lg border border-nisk text-nisk-muted hover:text-[var(--foreground)]"
          >
            Privacy &amp; Analytics
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              range === r.id
                ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/15 text-[var(--copper-melt)]'
                : 'border-nisk text-nisk-muted hover:text-[var(--foreground)]'
            }`}
          >
            {r.label}
          </button>
        ))}
        {data?.rangeLabel && (
          <span className="text-xs text-nisk-muted self-center ml-1">{data.rangeLabel}</span>
        )}
      </div>

      <p className="text-xs text-nisk-muted mb-6 max-w-3xl leading-relaxed border border-nisk rounded-lg px-3 py-2.5 bg-[var(--surface)]/40">
        Town-level and small-category breakdowns are hidden when fewer than{' '}
        {data?.minVolumeThreshold ?? 8} users match, to protect individual privacy. Suppression is
        enforced in SQL (<code className="text-[var(--copper-melt)]">HAVING count &gt;= 8</code>
        ), not just in the UI.
      </p>

      {loading && <p className="text-nisk-muted">Loading analytics…</p>}
      {error && <p className="text-[var(--error)]">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total signups" value={data.totalSignups} accent={CHART.melt} />
            <StatCard label="Total builds" value={data.totalBuilds} accent={CHART.copper} />
            <StatCard
              label="Most active category"
              value={
                data.mostActiveCategory
                  ? `${data.mostActiveCategory.icon} ${data.mostActiveCategory.name}`
                  : '—'
              }
              hint={
                data.mostActiveCategory ? `${data.mostActiveCategory.count} builds` : undefined
              }
            />
            <StatCard
              label="Most active region"
              value={data.mostActiveRegion?.name ?? '—'}
              hint={
                data.mostActiveRegion ? `${data.mostActiveRegion.count} builds` : undefined
              }
            />
            <StatCard
              label="Most active age range"
              value={data.mostActiveAgeRange?.label ?? '—'}
              hint={
                data.mostActiveAgeRange ? `${data.mostActiveAgeRange.count} builds` : undefined
              }
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <section className="bg-nisk-card border border-nisk rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Demand by category
              </h2>
              <p className="text-xs text-nisk-muted mb-4">What app types are trending</p>
              {categoryChartData.length === 0 ? (
                <p className="text-sm text-nisk-muted py-8 text-center">No build events in range</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      stroke={CHART.axis}
                      tick={{ fill: CHART.parchment, fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="builds" name="Builds" fill={CHART.copper} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="bg-nisk-card border border-nisk rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Demand by region
              </h2>
              <p className="text-xs text-nisk-muted mb-4">Country-level breakdown only</p>
              {regionChartData.length === 0 ? (
                <p className="text-sm text-nisk-muted py-8 text-center">No regional build data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={regionChartData} margin={{ bottom: 8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="region"
                      stroke={CHART.axis}
                      tick={{ fill: CHART.parchment, fontSize: 10 }}
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={72}
                    />
                    <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Builds" fill={CHART.melt} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <section className="bg-nisk-card border border-nisk rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Demand by age range
              </h2>
              <p className="text-xs text-nisk-muted mb-4">Coarse buckets only — never exact age</p>
              {ageRangeChartData.length === 0 ? (
                <p className="text-sm text-nisk-muted py-8 text-center">No age-range build data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ageRangeChartData} margin={{ bottom: 8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke={CHART.axis}
                      tick={{ fill: CHART.parchment, fontSize: 10 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="builds" name="Builds" fill={CHART.copper} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="bg-nisk-card border border-nisk rounded-xl p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Age range × category
              </h2>
              <p className="text-xs text-nisk-muted mb-4">
                Only combinations with ≥ {data.minVolumeThreshold} builds (SQL-filtered)
              </p>
              {ageCategoryChartData.length === 0 ? (
                <p className="text-sm text-nisk-muted py-8 text-center">
                  Insufficient volume — cross-tabs hidden to protect privacy
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ageCategoryChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid stroke={CHART.grid} horizontal={false} />
                    <XAxis type="number" stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      stroke={CHART.axis}
                      tick={{ fill: CHART.parchment, fontSize: 10 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="builds" name="Builds" fill={CHART.melt} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          {data.buildsByTownAndCategory.length > 0 && (
            <section className="bg-nisk-card border border-nisk rounded-xl p-5 mb-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">
                Town × category (volume-safe)
              </h2>
              <p className="text-xs text-nisk-muted mb-4">
                Town names shown only when ≥ {data.minVolumeThreshold} matching builds exist
              </p>
              <ul className="space-y-2 text-sm max-h-48 overflow-y-auto">
                {data.buildsByTownAndCategory.map((row) => (
                  <li
                    key={`${row.town}-${row.categorySlug}`}
                    className="flex justify-between gap-3 border-b border-nisk/50 pb-2"
                  >
                    <span className="text-nisk-muted">
                      {row.town} · {row.categoryIcon} {row.categoryLabel}
                    </span>
                    <span className="text-[var(--copper-melt)] font-medium">{row.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-nisk-card border border-nisk rounded-xl p-5 mb-8">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Trend over time</h2>
            <p className="text-xs text-nisk-muted mb-4">Builds and signups bucketed by selected range</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.trend}>
                <CartesianGrid stroke={CHART.grid} />
                <XAxis
                  dataKey="label"
                  stroke={CHART.axis}
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis stroke={CHART.axis} tick={{ fill: CHART.axis, fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ color: CHART.parchment, fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="builds"
                  name="Builds"
                  stroke={CHART.copper}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  name="Signups"
                  stroke={CHART.melt}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          <div className="p-4 rounded-xl border border-[var(--copper-primary)]/25 bg-[var(--copper-primary)]/5 text-sm text-nisk-muted">
            <p className="font-medium text-[var(--foreground)] mb-1">Privacy by design</p>
            <p>
              This dashboard reads only from <code>usage_events</code> — category slug, age-range
              bucket, coarse town (when volume allows), country-level region, event type, and
              timestamp. Individual prompts, exact ages, birthdates, and user identities are never
              stored or displayed here.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="bg-nisk-card border border-nisk rounded-xl p-4">
      <p
        className="text-2xl font-bold truncate"
        style={{ color: accent ?? 'var(--copper-melt)' }}
        title={String(value)}
      >
        {value}
      </p>
      <p className="text-sm text-nisk-muted">{label}</p>
      {hint && <p className="text-xs text-nisk-muted mt-1">{hint}</p>}
    </div>
  );
}

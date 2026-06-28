'use client';

import { useEffect, useMemo, useState } from 'react';
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
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import type { RevenueDashboardData } from '@/lib/admin/revenue-dashboard';
import { tierDisplayName } from '@/lib/tier-config';
import { BRAND_COLORS } from '@/lib/brand-colors';

const CHART = {
  copper: BRAND_COLORS.copperPrimary,
  melt: BRAND_COLORS.copperMelt,
  grid: 'rgba(184, 115, 51, 0.12)',
  axis: BRAND_COLORS.parchmentMuted,
};

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function Heatmap({ data }: { data: { date: string; creditsUsed: number }[] }) {
  const max = Math.max(...data.map((d) => d.creditsUsed), 1);
  const weeks: { date: string; creditsUsed: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="space-y-1 overflow-x-auto">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex gap-1">
          {week.map((day) => {
            const intensity = day.creditsUsed / max;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.creditsUsed} credits`}
                className="w-3 h-3 rounded-sm shrink-0"
                style={{
                  background: `rgba(184, 115, 51, ${0.08 + intensity * 0.92})`,
                }}
              />
            );
          })}
        </div>
      ))}
      <p className="text-[10px] text-nisk-muted pt-1">Last 90 days — darker = more credits used</p>
    </div>
  );
}

export default function AdminRevenueClient() {
  const [data, setData] = useState<RevenueDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/revenue', { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json as RevenueDashboardData);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const mrrChart = useMemo(
    () =>
      data?.mrrSeries.map((row) => ({
        month: row.month,
        MRR: row.mrrUsd,
        Revenue: row.revenueUsd,
      })) ?? [],
    [data]
  );

  if (loading) {
    return (
      <AdminPlatformShell title="Revenue" description="Loading…" stats={[]}>
        <p className="text-nisk-muted text-sm">Loading revenue analytics…</p>
      </AdminPlatformShell>
    );
  }

  if (error || !data) {
    return (
      <AdminPlatformShell title="Revenue" description="Error" stats={[]}>
        <p className="text-red-400 text-sm">{error ?? 'No data'}</p>
      </AdminPlatformShell>
    );
  }

  return (
    <AdminPlatformShell
      title="Revenue analytics"
      description="MRR, churn, ARPU, credit usage, and feature adoption"
      stats={[
        { label: 'Current MRR', value: formatUsd(data.summary.currentMrrUsd) },
        { label: 'Active subscribers', value: data.summary.activeSubscribers },
        {
          label: 'Churn (latest month)',
          value: `${data.summary.churnRateLatest}%`,
        },
        { label: 'Total users', value: data.summary.totalUsers },
      ]}
    >
      {!data.stripeConnected && (
        <p className="mb-4 text-sm text-amber-400/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          STRIPE_SECRET_KEY not set — MRR uses tier estimates. Add Stripe key for live subscription data.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/emails"
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          Email hub →
        </Link>
        <Link
          href="/admin/churn"
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          Churn risk →
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <section className="bg-nisk-card border border-nisk rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">MRR &amp; revenue (12 months)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrChart}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: CHART.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: '#0B0F19',
                    border: '1px solid rgba(184,115,51,0.35)',
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="MRR" stroke={CHART.copper} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Revenue" stroke={CHART.melt} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Churn rate by month</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.churnSeries}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: CHART.axis, fontSize: 10 }} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: '#0B0F19',
                    border: '1px solid rgba(184,115,51,0.35)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="churnRate" name="Churn %" fill={CHART.copper} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">ARPU by plan tier</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.arpuByTier} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="tier"
                  tick={{ fill: CHART.axis, fontSize: 10 }}
                  width={72}
                  tickFormatter={(t) => tierDisplayName(t).slice(0, 10)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0B0F19',
                    border: '1px solid rgba(184,115,51,0.35)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="arpuUsd" name="ARPU ($)" fill={CHART.melt} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Credit usage heatmap</h2>
          <Heatmap data={data.creditHeatmap} />
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold p-4 border-b border-nisk">Feature adoption</h2>
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)]/50">
              <tr>
                <th className="text-left p-3 text-nisk-muted font-medium">Feature</th>
                <th className="text-right p-3 text-nisk-muted font-medium">Users</th>
                <th className="text-right p-3 text-nisk-muted font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.featureAdoption.map((row) => (
                <tr key={row.feature} className="border-t border-nisk/60">
                  <td className="p-3">{row.label}</td>
                  <td className="p-3 text-right text-nisk-muted">{row.users}</td>
                  <td className="p-3 text-right text-[var(--copper-melt)]">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
          <h2 className="text-sm font-semibold p-4 border-b border-nisk">
            Top 10 active users (builds this month)
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)]/50">
              <tr>
                <th className="text-left p-3 text-nisk-muted font-medium">Email</th>
                <th className="text-right p-3 text-nisk-muted font-medium">Builds</th>
              </tr>
            </thead>
            <tbody>
              {data.topActiveUsers.map((row) => (
                <tr key={row.userId} className="border-t border-nisk/60">
                  <td className="p-3">
                    <span className="block truncate max-w-[200px]">{row.email}</span>
                    <span className="text-[10px] text-nisk-muted">{tierDisplayName(row.tier)}</span>
                  </td>
                  <td className="p-3 text-right font-semibold text-[var(--primary)]">
                    {row.buildsThisMonth}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AdminPlatformShell>
  );
}

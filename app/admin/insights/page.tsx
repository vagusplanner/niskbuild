"use client";

import { useEffect, useState } from 'react';
import Layout from '@/app/components/Layout';

interface TrendSummary {
  total_events: number;
  success_rate: string;
  top_verticals: { name: string; count: number }[];
  top_frameworks: { name: string; count: number }[];
  demographic_mix: { name: string; count: number }[];
  period: string;
  data_source: string;
  error?: string;
}

export default function AdminInsights() {
  const [data, setData] = useState<TrendSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights/summary')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Failed to load', total_events: 0, success_rate: '0%', top_verticals: [], top_frameworks: [], demographic_mix: [], period: '30d', data_source: '' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="text-white">Loading insights...</div>
      </Layout>
    );
  }

  if (data?.error) {
    return (
      <Layout>
        <div className="text-red-400">{data.error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="text-white max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Real-Time Software Composition Index</h1>
        <p className="text-nisk-muted text-sm mb-8">
          Privacy-first macro telemetry — no user IDs, emails, or raw prompts. Source:{' '}
          <code className="text-[var(--accent-cyan)]">{data?.data_source}</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <div className="text-3xl font-bold text-[var(--accent-cyan)]">{data?.total_events || 0}</div>
            <div className="text-sm text-nisk-muted">Anonymous events ({data?.period})</div>
          </div>
          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <div className="text-3xl font-bold text-emerald-400">{data?.success_rate || '0%'}</div>
            <div className="text-sm text-nisk-muted">Generation success rate</div>
          </div>
          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <div className="text-3xl font-bold text-[var(--primary)]">
              {data?.top_verticals?.[0]?.name?.slice(0, 20) || '—'}
            </div>
            <div className="text-sm text-nisk-muted">
              Top vertical ({data?.top_verticals?.[0]?.count || 0} builds)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <h2 className="text-lg font-semibold mb-3">App verticals</h2>
            {data?.top_verticals?.map((t, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-nisk text-sm">
                <span className="text-gray-300">{t.name}</span>
                <span className="text-[var(--accent-cyan)]">{t.count}</span>
              </div>
            ))}
          </div>

          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <h2 className="text-lg font-semibold mb-3">Tech stack trends</h2>
            {data?.top_frameworks?.map((t, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-nisk text-sm">
                <span className="text-gray-300">{t.name}</span>
                <span className="text-[var(--primary)]">{t.count}</span>
              </div>
            ))}
          </div>

          <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
            <h2 className="text-lg font-semibold mb-3">Demographic mix</h2>
            {data?.demographic_mix?.map((t, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-nisk text-sm">
                <span className="text-gray-300 capitalize">{t.name.replace('-', ' ')}</span>
                <span className="text-[var(--secondary)]">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 p-4 rounded-xl border border-nisk bg-nisk-surface text-sm text-nisk-muted">
          <p className="font-medium text-white mb-2">B2B API products</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <strong>Live Trend API</strong> — <code>GET /api/insights/trends</code> with{' '}
              <code>x-insights-api-key</code> header ($4,999/mo tier)
            </li>
            <li>
              <strong>Quarterly State of Modern Code</strong> — export from this dashboard for
              corporate licensing ($1,500/report)
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

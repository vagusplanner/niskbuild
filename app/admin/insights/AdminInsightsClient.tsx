"use client";

import { useEffect, useState } from 'react';

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

export default function AdminInsightsClient() {
  const [data, setData] = useState<TrendSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights/summary', { credentials: 'include' })
      .then((res) => res.json())
      .then(setData)
      .catch(() =>
        setData({
          error: 'Failed to load',
          total_events: 0,
          success_rate: '0%',
          top_verticals: [],
          top_frameworks: [],
          demographic_mix: [],
          period: '30d',
          data_source: '',
        })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-white">Loading insights...</div>;
  }

  if (data?.error) {
    return <div className="text-red-400">{data.error}</div>;
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Platform Insights</h1>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
          <p className="text-2xl font-bold">{data.total_events}</p>
          <p className="text-sm text-nisk-muted">Events ({data.period})</p>
        </div>
        <div className="bg-nisk-card border border-nisk p-4 rounded-xl">
          <p className="text-2xl font-bold">{data.success_rate}</p>
          <p className="text-sm text-nisk-muted">Generation success rate</p>
        </div>
      </div>
      <div className="space-y-6">
        <section>
          <h2 className="font-semibold mb-2">Top verticals</h2>
          <ul className="space-y-1 text-sm">
            {data.top_verticals.map((v) => (
              <li key={v.name} className="flex justify-between">
                <span>{v.name}</span>
                <span>{v.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Top frameworks</h2>
          <ul className="space-y-1 text-sm">
            {data.top_frameworks.map((f) => (
              <li key={f.name} className="flex justify-between">
                <span>{f.name}</span>
                <span>{f.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

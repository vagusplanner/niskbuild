'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';
import { statusLabel, type PlatformStatusValue } from '@/lib/platform-status-labels';

type Snapshot = {
  status: PlatformStatusValue;
  updatedAt: string | null;
  updates: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};

const STATUS_STYLES: Record<PlatformStatusValue, string> = {
  operational: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  down: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function StatusPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load status');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">System status</h1>
        <p className="text-sm text-nisk-muted mb-8">
          Manually maintained status for NiskBuild. Not an automated uptime monitor.
        </p>

        {error && (
          <p className="text-sm text-[var(--error)] mb-4">{error}</p>
        )}

        {!data && !error && (
          <p className="text-sm text-nisk-muted">Loading…</p>
        )}

        {data && (
          <>
            <div
              className={`rounded-xl border px-5 py-4 mb-8 ${STATUS_STYLES[data.status]}`}
            >
              <p className="text-xs uppercase tracking-wider opacity-80">Current status</p>
              <p className="text-2xl font-semibold mt-1">{statusLabel(data.status)}</p>
              {data.updatedAt && (
                <p className="text-xs mt-2 opacity-70">
                  Updated {new Date(data.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Updates</h2>
            {data.updates.length === 0 ? (
              <p className="text-sm text-nisk-muted">No incident updates posted.</p>
            ) : (
              <ul className="space-y-3">
                {data.updates.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-4 py-3"
                  >
                    <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{u.body}</p>
                    <p className="text-[10px] text-nisk-muted mt-2">
                      {new Date(u.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <p className="mt-10 text-xs text-nisk-muted">
          <Link href="/" className="text-[var(--copper-melt)] hover:underline">
            ← Home
          </Link>
        </p>
      </div>
    </Layout>
  );
}

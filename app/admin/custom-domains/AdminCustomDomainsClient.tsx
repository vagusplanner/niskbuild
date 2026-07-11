'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type DomainRow = {
  id: string;
  owner_id: string;
  owner_email?: string | null;
  hostname: string;
  status: string;
  vercel_attached: boolean;
  last_error: string | null;
  verified_at: string | null;
  updated_at: string;
  created_at: string;
};

function badge(status: string) {
  if (status === 'active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'dns_verified') {
    return 'border-[var(--copper-primary)]/35 bg-[var(--copper-primary)]/10 text-[var(--copper-melt)]';
  }
  if (status === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  return 'border-nisk text-nisk-muted';
}

export default function AdminCustomDomainsClient() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, dnsVerified: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'dns_verified' | 'active' | 'failed'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/custom-domains', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load');
      setDomains([]);
    } else {
      setDomains(data.domains ?? []);
      setStats(data.stats ?? { total: 0, pending: 0, dnsVerified: 0, active: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = domains.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return d.status === 'pending_dns' || d.status === 'failed';
    return d.status === filter;
  });

  return (
    <AdminPlatformShell
      title="Custom domains"
      description="Pending DNS verification vs active customer hostnames (White-Label+)."
      stats={[
        { label: 'Total', value: stats.total },
        { label: 'Pending / failed', value: stats.pending },
        { label: 'DNS verified', value: stats.dnsVerified },
        { label: 'Active', value: stats.active },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        {(['all', 'pending', 'dns_verified', 'active', 'failed'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filter === f
                ? 'border-[var(--copper-primary)] text-[var(--copper-melt)] bg-[var(--copper-primary)]/10'
                : 'border-nisk text-nisk-muted'
            }`}
          >
            {f}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-nisk px-3 py-1.5 text-xs text-nisk-muted"
        >
          Refresh
        </button>
        <Link href="/admin/tenants" className="text-xs text-[var(--copper-melt)] hover:underline ml-auto">
          Tenants →
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-300 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-nisk-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-nisk-muted">
          No domains yet. Customers add them under Settings → Domains after{' '}
          <code className="text-[var(--copper-light)]">custom-domains-migration.sql</code> is applied.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-nisk">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-nisk-muted">
              <tr>
                <th className="p-3">Hostname</th>
                <th className="p-3">Owner</th>
                <th className="p-3">Status</th>
                <th className="p-3">Vercel</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-nisk/70">
                  <td className="p-3 font-mono text-[var(--foreground)]">{d.hostname}</td>
                  <td className="p-3 text-nisk-muted">{d.owner_email || d.owner_id.slice(0, 8)}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${badge(d.status)}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3 text-nisk-muted">{d.vercel_attached ? 'yes' : 'no'}</td>
                  <td className="p-3 text-nisk-muted text-xs">
                    {new Date(d.updated_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-xs text-red-300/90 max-w-[220px] truncate" title={d.last_error || ''}>
                    {d.last_error || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPlatformShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type Tenant = {
  id: string;
  email: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  last_seen_at?: string | null;
};

type TenantDetail = Tenant & {
  project_count: number;
  cloud_credits_remaining?: number;
  stripe_customer_id?: string | null;
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  paid: number;
};

const TIERS = ['all', 'free', 'basic', 'pro', 'agency', 'scale', 'white_label', 'team_enterprise', 'sovereign'];
const STATUSES = ['all', 'active', 'inactive'];

export default function AdminTenantsClient() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, paid: 0 });
  const [tier, setTier] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TenantDetail | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tier !== 'all') params.set('tier', tier);
    if (status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/tenants?${params.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setTenants(data.tenants ?? []);
      setStats(data.stats ?? { total: 0, active: 0, inactive: 0, paid: 0 });
    }
    setLoading(false);
  }, [tier, status]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const viewTenant = async (id: string) => {
    const res = await fetch(`/api/admin/tenants/${id}`);
    const data = await res.json();
    if (res.ok) setSelected(data.tenant);
  };

  const updateStatus = async (id: string, action: 'suspend' | 'activate') => {
    setUpdatingId(id);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setUpdatingId(null);
    if (res.ok) {
      fetchTenants();
      if (selected?.id === id) viewTenant(id);
    }
  };

  return (
    <AdminPlatformShell
      title="👥 Platform Tenants"
      description="View and manage NiskBuild subscriber accounts"
      stats={[
        { label: 'Total tenants', value: stats.total },
        { label: 'Active', value: stats.active },
        { label: 'Inactive / suspended', value: stats.inactive },
        { label: 'Paid tiers', value: stats.paid },
      ]}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="bg-nisk-card border border-nisk rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              Tier: {t}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-nisk-card border border-nisk rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={fetchTenants}
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:bg-[var(--surface-elevated)]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-nisk-muted py-12 text-center">Loading tenants...</p>
      ) : (
        <div className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left p-4 font-medium text-nisk-muted">Email</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Tier</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Status</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Joined</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-nisk hover:bg-[var(--surface)]/50">
                    <td className="p-4 text-[var(--foreground)]">{tenant.email}</td>
                    <td className="p-4 capitalize">{tenant.subscription_tier || 'free'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          tenant.subscription_status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {tenant.subscription_status || 'inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-nisk-muted">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => viewTenant(tenant.id)}
                          className="px-3 py-1 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--card-bg)] text-xs"
                        >
                          View
                        </button>
                        {tenant.subscription_status === 'active' ? (
                          <button
                            type="button"
                            disabled={updatingId === tenant.id}
                            onClick={() => updateStatus(tenant.id, 'suspend')}
                            className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingId === tenant.id}
                            onClick={() => updateStatus(tenant.id, 'activate')}
                            className="px-3 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        <Link
                          href="/admin/users"
                          className="px-3 py-1 rounded-lg border border-nisk text-xs inline-flex items-center"
                        >
                          Manage tier
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-nisk-card border border-nisk rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Tenant details</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-nisk-muted hover:text-white">
                ✕
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Email</dt>
                <dd className="text-[var(--foreground)]">{selected.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Tier</dt>
                <dd className="capitalize">{selected.subscription_tier || 'free'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Status</dt>
                <dd>{selected.subscription_status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Projects</dt>
                <dd>{selected.project_count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Cloud credits</dt>
                <dd>{selected.cloud_credits_remaining ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-nisk-muted">Joined</dt>
                <dd>{new Date(selected.created_at).toLocaleString()}</dd>
              </div>
              {selected.last_seen_at && (
                <div className="flex justify-between gap-4">
                  <dt className="text-nisk-muted">Last seen</dt>
                  <dd>{new Date(selected.last_seen_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </AdminPlatformShell>
  );
}

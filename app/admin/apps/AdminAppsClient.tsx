"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type AppRow = {
  id: string;
  app_name: string;
  status: string;
  created_at: string;
  revenue_cents: number;
};

type Stats = {
  total: number;
  active: number;
  draft: number;
  inactive: number;
  totalRevenueCents: number;
};

const STATUSES = ['all', 'draft', 'active', 'inactive', 'archived'];

function formatRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminAppsClient() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    draft: 0,
    inactive: 0,
    totalRevenueCents: 0,
  });
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AppRow | null>(null);
  const [editName, setEditName] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);

    const res = await fetch(`/api/admin/apps?${params.toString()}`);
    const data = await res.json();
    if (res.ok) {
      setApps(data.apps ?? []);
      setStats(data.stats ?? { total: 0, active: 0, draft: 0, inactive: 0, totalRevenueCents: 0 });
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const toggleStatus = async (id: string) => {
    setUpdatingId(id);
    const res = await fetch(`/api/admin/apps/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_status' }),
    });
    setUpdatingId(null);
    if (res.ok) fetchApps();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setUpdatingId(editing.id);
    const res = await fetch(`/api/admin/apps/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: editName }),
    });
    setUpdatingId(null);
    if (res.ok) {
      setEditing(null);
      fetchApps();
    }
  };

  const statusBadge = (value: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-500/15 text-emerald-400',
      draft: 'bg-amber-500/15 text-amber-400',
      inactive: 'bg-red-500/15 text-red-400',
      archived: 'bg-gray-500/15 text-gray-400',
    };
    return colors[value] ?? 'bg-gray-500/15 text-gray-400';
  };

  return (
    <AdminPlatformShell
      title="📱 First-Party Apps"
      description="Manage apps in firstparty.app_registry"
      stats={[
        { label: 'Total apps', value: stats.total },
        { label: 'Active', value: stats.active },
        { label: 'Draft', value: stats.draft },
        { label: 'Marketplace revenue', value: formatRevenue(stats.totalRevenueCents) },
      ]}
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-nisk-card border border-nisk rounded-lg px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={fetchApps} className="px-4 py-2 rounded-lg border border-nisk text-sm">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-nisk-muted py-12 text-center">Loading apps...</p>
      ) : (
        <div className="bg-nisk-card border border-nisk rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-elevated)] border-b border-nisk">
                <tr>
                  <th className="text-left p-4 font-medium text-nisk-muted">App name</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Status</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Created</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Revenue</th>
                  <th className="text-left p-4 font-medium text-nisk-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-nisk hover:bg-[var(--surface)]/50">
                    <td className="p-4 font-medium text-[var(--foreground)]">{app.app_name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-nisk-muted">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-[var(--primary)]">{formatRevenue(app.revenue_cents)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {app.app_name === 'Vagus Planner' && (
                          <Link
                            href="/builder/vagus-planner"
                            className="px-3 py-1 rounded-lg bg-[var(--primary)]/20 text-xs"
                          >
                            Open studio
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(app);
                            setEditName(app.app_name);
                          }}
                          className="px-3 py-1 rounded-lg bg-[var(--surface-elevated)] text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === app.id}
                          onClick={() => toggleStatus(app.id)}
                          className="px-3 py-1 rounded-lg border border-nisk text-xs disabled:opacity-50"
                        >
                          {app.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-nisk-card border border-nisk rounded-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Edit app</h2>
            <label className="block text-sm text-nisk-muted mb-2">App name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[var(--surface)] border border-nisk rounded-lg px-3 py-2 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-nisk text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingId === editing.id}
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg btn-primary text-sm disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPlatformShell>
  );
}

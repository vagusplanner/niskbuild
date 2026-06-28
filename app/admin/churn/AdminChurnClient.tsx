'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import { tierDisplayName } from '@/lib/tier-config';

type ChurnUser = {
  id: string;
  email: string;
  subscription_tier: string;
  cloud_credits_remaining: number | null;
  created_at: string;
  daysSinceLastBuild: number;
};

export default function AdminChurnClient() {
  const [users, setUsers] = useState<ChurnUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/churn', { credentials: 'include' });
    const data = await res.json();
    if (res.ok) setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendReengagement = async (userId: string) => {
    setSending(userId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setMessage('Re-engagement email sent.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(null);
    }
  };

  return (
    <AdminPlatformShell
      title="Churn risk"
      description="Paid users with no AI builds in the last 14 days"
      stats={[
        { label: 'At risk today', value: users.length },
        {
          label: 'Threshold',
          value: '14 days',
          hint: 'Since last_build_at or signup',
        },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/layer-overview"
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          ← Admin home
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg border border-nisk text-sm hover:border-[var(--copper-primary)]/40"
        >
          Refresh
        </button>
      </div>

      {message && (
        <p className="mb-4 text-sm text-[var(--copper-melt)] bg-[var(--copper-primary)]/10 border border-[var(--copper-primary)]/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="bg-nisk-card border border-red-500/30 rounded-xl overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-nisk-muted text-center">Loading…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-sm text-nisk-muted text-center">No paid users at churn risk today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-500/10 border-b border-red-500/20">
                <tr>
                  <th className="text-left p-3 font-medium text-nisk-muted">Email</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Plan</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Days inactive</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Credits left</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Joined</th>
                  <th className="text-left p-3 font-medium text-nisk-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-red-500/10 hover:bg-red-500/5"
                  >
                    <td className="p-3 font-medium text-[var(--foreground)]">{row.email}</td>
                    <td className="p-3 text-nisk-muted">{tierDisplayName(row.subscription_tier)}</td>
                    <td className="p-3 text-red-400 font-semibold">{row.daysSinceLastBuild}d</td>
                    <td className="p-3 text-nisk-muted">{row.cloud_credits_remaining ?? '—'}</td>
                    <td className="p-3 text-nisk-muted text-xs">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={sending === row.id}
                        onClick={() => void sendReengagement(row.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {sending === row.id ? 'Sending…' : 'Send re-engagement email'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPlatformShell>
  );
}

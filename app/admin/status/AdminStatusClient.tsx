'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import { statusLabel, type PlatformStatusValue } from '@/lib/platform-status-labels';

type Snapshot = {
  status: PlatformStatusValue;
  updatedAt: string | null;
  updatedBy: string | null;
  updates: Array<{
    id: string;
    body: string;
    createdAt: string;
    createdBy: string | null;
  }>;
};

export default function AdminStatusClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [updateText, setUpdateText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/status', { credentials: 'include' });
    const json = await res.json();
    if (res.ok) setData(json);
    else setError(json.error || 'Failed to load');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (status: PlatformStatusValue) => {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/status', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || 'Failed to update');
      return;
    }
    setData(json);
  };

  const postUpdate = async () => {
    if (!updateText.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/admin/status', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: updateText }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || 'Failed to post');
      return;
    }
    setUpdateText('');
    setData(json);
  };

  return (
    <AdminPlatformShell
      title="System status"
      description="Manual Operational / Degraded / Down flag + short incident notes for /status"
      stats={[
        { label: 'Public page', value: '/status' },
        { label: 'Current', value: data ? statusLabel(data.status) : '—' },
      ]}
    >
      <div className="mb-4">
        <Link href="/status" className="text-sm text-[var(--copper-melt)] hover:underline" target="_blank">
          Open public /status →
        </Link>
      </div>

      {error && <p className="text-sm text-[var(--error)] mb-4">{error}</p>}

      <div className="bg-nisk-card border border-nisk rounded-xl p-5 mb-6">
        <p className="text-sm font-medium mb-3">Set status</p>
        <div className="flex flex-wrap gap-2">
          {(['operational', 'degraded', 'down'] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving || data?.status === s}
              onClick={() => void setStatus(s)}
              className={`px-4 py-2 rounded-lg text-sm capitalize disabled:opacity-50 ${
                data?.status === s
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-nisk hover:bg-[var(--surface-elevated)]'
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
        {data?.updatedAt && (
          <p className="text-xs text-nisk-muted mt-3">
            Last changed {new Date(data.updatedAt).toLocaleString()}
            {data.updatedBy ? ` by ${data.updatedBy}` : ''}
          </p>
        )}
      </div>

      <div className="bg-nisk-card border border-nisk rounded-xl p-5 mb-6">
        <p className="text-sm font-medium mb-3">Post update</p>
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          rows={3}
          placeholder='e.g. "Investigating elevated error rates"'
          className="w-full px-3 py-2 rounded-lg bg-nisk border border-nisk text-sm mb-3"
        />
        <button
          type="button"
          disabled={saving || !updateText.trim()}
          onClick={() => void postUpdate()}
          className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Post to /status'}
        </button>
      </div>

      <div className="bg-nisk-card border border-nisk rounded-xl p-5">
        <p className="text-sm font-medium mb-3">Recent updates</p>
        {!data?.updates.length ? (
          <p className="text-sm text-nisk-muted">None yet</p>
        ) : (
          <ul className="space-y-3">
            {data.updates.map((u) => (
              <li key={u.id} className="border-b border-nisk pb-3 last:border-0">
                <p className="text-sm whitespace-pre-wrap">{u.body}</p>
                <p className="text-[10px] text-nisk-muted mt-1">
                  {new Date(u.createdAt).toLocaleString()}
                  {u.createdBy ? ` · ${u.createdBy}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminPlatformShell>
  );
}

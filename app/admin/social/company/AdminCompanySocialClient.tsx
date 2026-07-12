'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';

type Channel = {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
  platform: string | null;
  organizationName: string;
  isQueuePaused: boolean;
};

type Draft = {
  id: string;
  platform: string;
  body: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  channelId: string | null;
  channelName: string | null;
  service: string | null;
};

type Snapshot = {
  configured: boolean;
  reminderDays: number;
  lastCompanyPostAt: string | null;
  daysSinceLastPost: number | null;
  needsReminder: boolean;
  reminderMessage: string | null;
  channels: Channel[];
  channelsError: string | null;
  drafts: Draft[];
};

export default function AdminCompanySocialClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState('');
  const [editBodies, setEditBodies] = useState<Record<string, string>>({});
  const [scheduleByDraft, setScheduleByDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/social/company', { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Failed to load');
      setLoading(false);
      return;
    }
    setData(json);
    const bodies: Record<string, string> = {};
    for (const d of json.drafts as Draft[]) bodies[d.id] = d.body;
    setEditBodies(bodies);
    if (!channelId && json.channels?.[0]?.id) {
      setChannelId(json.channels[0].id);
    }
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const generateWeekly = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/social/company/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'weekly' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generate failed');
      setMessage(json.message || 'Drafts created');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  };

  const generateSingle = async () => {
    if (!channelId) {
      setError('Pick a Buffer channel first');
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/social/company/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'single', channelId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Generate failed');
      setMessage(json.message || 'Draft created');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editBodies[id] ?? '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setMessage('Draft saved');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const sendDraft = async (
    id: string,
    mode: 'shareNow' | 'addToQueue' | 'customScheduled'
  ) => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const dueLocal = scheduleByDraft[id];
      const dueAt =
        mode === 'customScheduled' && dueLocal
          ? new Date(dueLocal).toISOString()
          : null;
      if (mode === 'customScheduled' && !dueAt) {
        throw new Error('Pick a schedule time for custom schedule');
      }
      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          dueAt,
          body: editBodies[id],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publish failed');
      setMessage(json.message || 'Sent to Buffer');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminPlatformShell
        title="Company social"
        description="Loading…"
        stats={[{ label: 'Status', value: '…' }]}
      >
        <p className="text-sm text-nisk-muted">Loading company Buffer composer…</p>
      </AdminPlatformShell>
    );
  }

  return (
    <AdminPlatformShell
      title="Company social"
      description="Post as NiskBuild via your personal Buffer API key (GraphQL) — not customer OAuth"
      stats={[
        { label: 'API key', value: data.configured ? 'Set' : 'Missing' },
        { label: 'Channels', value: data.channels.length },
        { label: 'Ready drafts', value: data.drafts.length },
        {
          label: 'Days since post',
          value: data.daysSinceLastPost == null ? '—' : data.daysSinceLastPost,
        },
      ]}
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/social" className="text-[var(--copper-melt)] hover:underline">
          ← Social Hub
        </Link>
      </div>

      {data.needsReminder && data.reminderMessage && (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {data.reminderMessage}
        </div>
      )}

      {!data.configured && (
        <div className="mb-5 rounded-xl border border-[var(--error)]/40 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]">
          Set <code className="font-mono text-xs">BUFFER_PERSONAL_API_KEY</code> in server env
          (Buffer → Settings → API → create personal key). Never expose it to the client.
        </div>
      )}

      {message && (
        <p className="mb-4 text-sm text-[var(--success)] border border-[var(--success)]/30 rounded-lg px-3 py-2 bg-[var(--success)]/10">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-[var(--error)] border border-[var(--error)]/30 rounded-lg px-3 py-2 bg-[var(--error)]/10">
          {error}
        </p>
      )}
      {data.channelsError && (
        <p className="mb-4 text-sm text-[var(--error)]">{data.channelsError}</p>
      )}

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Pre-fill this week</h2>
        <p className="text-xs text-nisk-muted mb-4">
          Generates 2–3 AI drafts across your connected LinkedIn / X / Instagram / Facebook
          channels. Review and confirm — no writing from scratch on posting day.
        </p>
        <button
          type="button"
          disabled={busy || !data.configured}
          onClick={() => void generateWeekly()}
          className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 disabled:opacity-50"
        >
          {busy ? 'Working…' : "Generate this week's posts"}
        </button>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Channels</h2>
        {data.channels.length === 0 ? (
          <p className="text-sm text-nisk-muted">
            No channels returned. Connect social accounts in Buffer, then refresh.
          </p>
        ) : (
          <ul className="text-sm space-y-2 mb-4">
            {data.channels.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-nisk pb-2">
                <span className="text-white">
                  {c.displayName || c.name}{' '}
                  <span className="text-nisk-muted text-xs">({c.service})</span>
                </span>
                <span className="text-xs text-nisk-muted">{c.organizationName}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-nisk-muted">
            Single-channel generate
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="mt-1 block rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white min-w-[220px]"
            >
              {data.channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.displayName || c.name) + ` · ${c.service}`}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !data.configured || !channelId}
            onClick={() => void generateSingle()}
            className="rounded-lg border border-nisk px-4 py-2 text-sm hover:bg-[var(--surface-elevated)] disabled:opacity-50"
          >
            Generate one draft
          </button>
        </div>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Ready to confirm</h2>
        {data.drafts.length === 0 ? (
          <p className="text-sm text-nisk-muted">No drafts yet — generate this week&apos;s posts above.</p>
        ) : (
          <ul className="space-y-5">
            {data.drafts.map((d) => (
              <li key={d.id} className="rounded-xl border border-nisk p-4">
                <div className="flex flex-wrap justify-between gap-2 mb-2 text-xs text-nisk-muted">
                  <span className="uppercase tracking-wide text-[var(--copper-melt)]">
                    {d.platform}
                    {d.channelName ? ` · ${d.channelName}` : ''}
                  </span>
                  <span>{new Date(d.createdAt).toLocaleString()}</span>
                </div>
                <textarea
                  value={editBodies[d.id] ?? d.body}
                  onChange={(e) =>
                    setEditBodies((prev) => ({ ...prev, [d.id]: e.target.value }))
                  }
                  rows={6}
                  className="w-full rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white mb-3"
                />
                <div className="flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveDraft(d.id)}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Save edits
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendDraft(d.id, 'shareNow')}
                    className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] disabled:opacity-50"
                  >
                    Publish now
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendDraft(d.id, 'addToQueue')}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Add to queue
                  </button>
                  <label className="text-[10px] text-nisk-muted">
                    Schedule
                    <input
                      type="datetime-local"
                      value={scheduleByDraft[d.id] || ''}
                      onChange={(e) =>
                        setScheduleByDraft((prev) => ({ ...prev, [d.id]: e.target.value }))
                      }
                      className="mt-0.5 block rounded border border-nisk bg-[var(--code-bg)] px-2 py-1 text-xs text-white"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sendDraft(d.id, 'customScheduled')}
                    className="rounded-lg border border-nisk px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    Schedule at time
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPlatformShell>
  );
}

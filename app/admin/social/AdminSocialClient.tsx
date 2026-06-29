'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPlatformShell from '@/app/components/admin/AdminPlatformShell';
import type { SocialTheme } from '@/lib/social-hub/theme-bank';

type HubConfig = {
  current_phase: number;
  current_week: number;
  ugc_percentage: number;
  active_theme_ids: string[];
  weekly_review_notes: string | null;
};

type Connection = {
  userId: string;
  email: string;
  bufferProfileId: string | null;
  updatedAt: string;
};

type PostRow = {
  id: string;
  email: string;
  platform: string;
  body: string;
  status: string;
  scheduledAt: string | null;
};

type Phase = {
  phase: number;
  title: string;
  weeks: string;
  goals: readonly string[];
};

export default function AdminSocialClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<HubConfig | null>(null);
  const [suggestedUgc, setSuggestedUgc] = useState(25);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [weeklyReviewRules, setWeeklyReviewRules] = useState<string[]>([]);
  const [themeBank, setThemeBank] = useState<SocialTheme[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/social', { credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setConfig(data.config);
      setSuggestedUgc(data.suggestedUgc ?? 25);
      setPhases(data.phases ?? []);
      setWeeklyReviewRules(data.weeklyReviewRules ?? []);
      setThemeBank(data.themeBank ?? []);
      setConnections(data.connections ?? []);
      setPosts(data.posts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/social', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPhase: config.current_phase,
          currentWeek: config.current_week,
          ugcPercentage: config.ugc_percentage,
          activeThemeIds: config.active_theme_ids,
          weeklyReviewNotes: config.weekly_review_notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setConfig(data.config);
      setMessage('Social Hub config saved.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = (id: string) => {
    if (!config) return;
    const active = new Set(config.active_theme_ids);
    if (active.has(id)) active.delete(id);
    else active.add(id);
    setConfig({ ...config, active_theme_ids: [...active] });
  };

  if (loading || !config) {
    return (
      <AdminPlatformShell
        title="Social Hub"
        description="Loading…"
        stats={[
          { label: 'Buffer connections', value: '—' },
          { label: 'Queued posts', value: '—' },
          { label: 'Active themes', value: '—' },
        ]}
      >
        <p className="text-sm text-nisk-muted">Loading Social Hub…</p>
      </AdminPlatformShell>
    );
  }

  return (
    <AdminPlatformShell
      title="Social Hub"
      description="Buffer connections, content phases, UGC ramp, and theme bank"
      stats={[
        { label: 'Buffer connections', value: connections.length },
        { label: 'Queued posts', value: posts.filter((p) => p.status !== 'published').length },
        { label: 'Active themes', value: config.active_theme_ids.length },
      ]}
    >
      {message && (
        <p className="mb-4 text-sm text-[var(--copper-melt)] border border-[var(--copper-primary)]/30 rounded-lg px-3 py-2 bg-[var(--copper-primary)]/10">
          {message}
        </p>
      )}

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Content plan</h2>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <label className="text-xs text-nisk-muted">
            Phase (0–4)
            <input
              type="number"
              min={0}
              max={4}
              value={config.current_phase}
              onChange={(e) => setConfig({ ...config, current_phase: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-nisk-muted">
            Week (1–12)
            <input
              type="number"
              min={1}
              max={12}
              value={config.current_week}
              onChange={(e) => setConfig({ ...config, current_week: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-nisk-muted">
            UGC % (suggested: {suggestedUgc}%)
            <input
              type="number"
              min={0}
              max={100}
              value={config.ugc_percentage}
              onChange={(e) => setConfig({ ...config, ugc_percentage: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {phases.map((p) => (
            <div
              key={p.phase}
              className={`rounded-lg border px-3 py-2 text-xs ${
                config.current_phase === p.phase
                  ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/10'
                  : 'border-nisk'
              }`}
            >
              <p className="font-semibold text-white">
                Phase {p.phase}: {p.title}
              </p>
              <p className="text-nisk-muted">Weeks {p.weeks}</p>
            </div>
          ))}
        </div>

        <label className="text-xs text-nisk-muted block mb-4">
          Weekly review notes
          <textarea
            value={config.weekly_review_notes ?? ''}
            onChange={(e) => setConfig({ ...config, weekly_review_notes: e.target.value })}
            rows={3}
            className="mt-1 w-full rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="button"
          onClick={() => void saveConfig()}
          disabled={saving}
          className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save config'}
        </button>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Weekly review rules</h2>
        <ul className="text-sm text-nisk-muted list-disc pl-5 space-y-1">
          {weeklyReviewRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Theme bank (20)</h2>
        <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {themeBank.map((theme) => {
            const active = config.active_theme_ids.includes(theme.id);
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => toggleTheme(theme.id)}
                className={`text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                  active
                    ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/10'
                    : 'border-nisk hover:border-[var(--copper-primary)]/30'
                }`}
              >
                <p className="font-semibold text-white">{theme.title}</p>
                <p className="text-nisk-muted mt-0.5">{theme.hook}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Buffer connections</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-nisk-muted">No Buffer accounts connected yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {connections.map((c) => (
              <li key={c.userId} className="flex justify-between border-b border-nisk pb-2">
                <span className="text-white">{c.email || c.userId}</span>
                <span className="text-nisk-muted text-xs">
                  {c.bufferProfileId ? `Profile ${c.bufferProfileId}` : 'Connected'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-nisk-muted mt-3">
          Users connect via{' '}
          <Link href="/api/social/buffer/auth" className="text-[var(--copper-melt)] hover:underline">
            /api/social/buffer/auth
          </Link>{' '}
          from the builder Social panel.
        </p>
      </section>

      <section className="glass-panel rounded-2xl border border-nisk p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Recent posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-nisk-muted">No queued posts yet.</p>
        ) : (
          <ul className="text-xs space-y-3 max-h-64 overflow-y-auto">
            {posts.map((p) => (
              <li key={p.id} className="border border-nisk rounded-lg p-3">
                <div className="flex justify-between text-nisk-muted mb-1">
                  <span>{p.platform}</span>
                  <span>{p.status}</span>
                </div>
                <p className="text-white line-clamp-2">{p.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPlatformShell>
  );
}

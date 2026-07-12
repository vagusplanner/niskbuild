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

type InstagramType = 'post' | 'story' | 'reel';

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
  mediaUrl: string | null;
  mediaKind: 'image' | 'video' | null;
  instagramType: InstagramType | null;
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

function isInstagramDraft(d: Draft): boolean {
  return d.platform === 'instagram' || Boolean(d.service?.toLowerCase().includes('instagram'));
}

function instagramReady(d: Draft, igType: InstagramType | null, mediaUrl: string | null, mediaKind: 'image' | 'video' | null): string | null {
  if (!isInstagramDraft(d)) return null;
  if (!igType) return 'Pick Instagram type (post / story / reel)';
  if (!mediaUrl?.trim()) return 'Attach an image or video for Instagram';
  if (igType === 'reel' && mediaKind !== 'video') return 'Reels require a video file';
  return null;
}

export default function AdminCompanySocialClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState('');
  const [editBodies, setEditBodies] = useState<Record<string, string>>({});
  const [scheduleByDraft, setScheduleByDraft] = useState<Record<string, string>>({});
  const [igTypeByDraft, setIgTypeByDraft] = useState<Record<string, InstagramType>>({});
  const [mediaByDraft, setMediaByDraft] = useState<
    Record<string, { url: string | null; kind: 'image' | 'video' | null }>
  >({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
    const igTypes: Record<string, InstagramType> = {};
    const media: Record<string, { url: string | null; kind: 'image' | 'video' | null }> = {};
    for (const d of json.drafts as Draft[]) {
      bodies[d.id] = d.body;
      if (d.instagramType) igTypes[d.id] = d.instagramType;
      else if (isInstagramDraft(d)) igTypes[d.id] = 'post';
      media[d.id] = { url: d.mediaUrl, kind: d.mediaKind };
    }
    setEditBodies(bodies);
    setIgTypeByDraft(igTypes);
    setMediaByDraft(media);
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
      const res = await fetch(`/api/admin/social/company/generate`, {
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
      const draft = data?.drafts.find((d) => d.id === id);
      const payload: Record<string, unknown> = { body: editBodies[id] ?? '' };
      if (draft && isInstagramDraft(draft)) {
        payload.instagramType = igTypeByDraft[id] || 'post';
      }
      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const uploadMedia = async (id: string, file: File) => {
    setUploadingId(id);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      const draft = json.draft as Draft;
      setMediaByDraft((prev) => ({
        ...prev,
        [id]: { url: draft.mediaUrl, kind: draft.mediaKind },
      }));
      setMessage('Media attached');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const clearMedia = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearMedia: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Clear failed');
      setMediaByDraft((prev) => ({ ...prev, [id]: { url: null, kind: null } }));
      setMessage('Media cleared');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clear failed');
    } finally {
      setBusy(false);
    }
  };

  const sendDraft = async (
    id: string,
    mode: 'shareNow' | 'addToQueue' | 'customScheduled'
  ) => {
    const draft = data?.drafts.find((d) => d.id === id);
    if (!draft) return;

    const media = mediaByDraft[id] ?? { url: draft.mediaUrl, kind: draft.mediaKind };
    const igType = igTypeByDraft[id] ?? draft.instagramType ?? (isInstagramDraft(draft) ? 'post' : null);
    const igBlock = instagramReady(draft, igType, media.url, media.kind);
    if (igBlock) {
      setError(igBlock);
      return;
    }

    if (mode === 'addToQueue' && draft.channelId) {
      const ch = data?.channels.find((c) => c.id === draft.channelId);
      if (ch?.isQueuePaused) {
        setError(
          `Queue is paused for ${ch.displayName || ch.name}. Resume it in Buffer, or use Publish now / Schedule.`
        );
        return;
      }
    }

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
      if (mode === 'customScheduled' && dueAt) {
        const dueMs = new Date(dueAt).getTime();
        if (Number.isNaN(dueMs) || dueMs <= Date.now() + 60_000) {
          throw new Error('Schedule time must be at least 1 minute in the future');
        }
      }

      const res = await fetch(`/api/admin/social/company/drafts/${id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          dueAt,
          body: editBodies[id],
          instagramType: isInstagramDraft(draft) ? igType : undefined,
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

  const pausedChannels = data.channels.filter((c) => c.isQueuePaused);

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

      {pausedChannels.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Queue paused in Buffer for:{' '}
          {pausedChannels.map((c) => c.displayName || c.name).join(', ')}. &quot;Add to queue&quot;
          will be blocked until you resume those queues — Publish now / Schedule still work.
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
          channels. Review and confirm — Instagram drafts also need an image/video before send.
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
                  {c.isQueuePaused ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-300">
                      queue paused
                    </span>
                  ) : null}
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
            {data.drafts.map((d) => {
              const ig = isInstagramDraft(d);
              const media = mediaByDraft[d.id] ?? { url: d.mediaUrl, kind: d.mediaKind };
              const igType = igTypeByDraft[d.id] ?? d.instagramType ?? 'post';
              const igHint = instagramReady(d, igType, media.url, media.kind);
              const queuePaused = Boolean(
                d.channelId && data.channels.find((c) => c.id === d.channelId)?.isQueuePaused
              );
              const actionsDisabled = busy || Boolean(igHint);

              return (
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

                  {ig && (
                    <div className="mb-3 rounded-lg border border-[var(--copper-primary)]/25 bg-[var(--copper-primary)]/5 p-3 space-y-3">
                      <p className="text-[10px] uppercase tracking-wider text-nisk-muted">
                        Instagram requirements
                      </p>
                      <label className="block text-xs text-nisk-muted">
                        Type
                        <select
                          value={igType}
                          onChange={(e) =>
                            setIgTypeByDraft((prev) => ({
                              ...prev,
                              [d.id]: e.target.value as InstagramType,
                            }))
                          }
                          className="mt-1 block rounded-lg border border-nisk bg-[var(--code-bg)] px-3 py-2 text-sm text-white"
                        >
                          <option value="post">Post (feed)</option>
                          <option value="story">Story</option>
                          <option value="reel">Reel (needs video)</option>
                        </select>
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-nisk px-3 py-1.5 text-xs hover:bg-[var(--surface-elevated)]">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                            className="sr-only"
                            disabled={busy || uploadingId === d.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) void uploadMedia(d.id, file);
                            }}
                          />
                          {uploadingId === d.id ? 'Uploading…' : 'Upload image / video'}
                        </label>
                        {media.url ? (
                          <>
                            <a
                              href={media.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[var(--copper-melt)] hover:underline truncate max-w-[220px]"
                            >
                              {media.kind || 'media'} attached
                            </a>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void clearMedia(d.id)}
                              className="text-xs text-nisk-muted hover:text-[var(--error)]"
                            >
                              Clear
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-amber-200/90">No media yet</span>
                        )}
                      </div>
                      {media.url && media.kind === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={media.url}
                          alt="Draft attachment preview"
                          className="max-h-40 rounded-lg border border-nisk object-contain"
                        />
                      ) : null}
                      {igHint ? (
                        <p className="text-xs text-amber-200">{igHint}</p>
                      ) : (
                        <p className="text-xs text-[var(--success)]">Ready for Buffer</p>
                      )}
                    </div>
                  )}

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
                      disabled={actionsDisabled}
                      title={igHint || undefined}
                      onClick={() => void sendDraft(d.id, 'shareNow')}
                      className="rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] disabled:opacity-50"
                    >
                      Publish now
                    </button>
                    <button
                      type="button"
                      disabled={actionsDisabled || queuePaused}
                      title={
                        igHint ||
                        (queuePaused ? 'Queue paused in Buffer for this channel' : undefined)
                      }
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
                      disabled={actionsDisabled}
                      title={igHint || undefined}
                      onClick={() => void sendDraft(d.id, 'customScheduled')}
                      className="rounded-lg border border-nisk px-3 py-1.5 text-xs disabled:opacity-50"
                    >
                      Schedule at time
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AdminPlatformShell>
  );
}

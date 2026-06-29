"use client";

import { useEffect, useMemo, useState } from 'react';
import type { SocialPostKey, SocialPosts } from '@/lib/social-publisher';
import { SOCIAL_POST_LABELS } from '@/lib/social-publisher';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';
import {
  canDirectPublishSocial,
  canScheduleSocialPosts,
  hasSocialProAddon,
} from '@/lib/tier-config';

type SocialPublisherPanelProps = {
  open: boolean;
  onClose: () => void;
  prompt: string;
  blueprint: ComponentBlueprint | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  purchasedTemplates?: unknown;
};

type BufferProfile = {
  id: string;
  service: string;
  formatted_username: string;
  service_username?: string;
};

const PLATFORMS: SocialPostKey[] = [
  'instagram',
  'linkedin',
  'twitter',
  'facebook',
  'google_business',
  'tiktok_script',
  'whatsapp',
];

const BUFFER_PLATFORMS = new Set<SocialPostKey>([
  'instagram',
  'linkedin',
  'twitter',
  'facebook',
]);

const PLATFORM_TO_BUFFER_SERVICE: Record<string, string> = {
  instagram: 'instagram',
  linkedin: 'linkedin',
  twitter: 'twitter',
  facebook: 'facebook',
};

function profilesForPlatform(profiles: BufferProfile[], platform: SocialPostKey) {
  const service = PLATFORM_TO_BUFFER_SERVICE[platform];
  if (!service) return [];
  return profiles.filter((p) => p.service.toLowerCase() === service);
}

export default function SocialPublisherPanel({
  open,
  onClose,
  prompt,
  blueprint,
  subscriptionTier,
  subscriptionStatus,
  purchasedTemplates,
}: SocialPublisherPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPosts | null>(null);
  const [copiedKey, setCopiedKey] = useState<SocialPostKey | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [bufferConnected, setBufferConnected] = useState(false);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [bufferProfiles, setBufferProfiles] = useState<BufferProfile[]>([]);
  const [selectedProfileByPlatform, setSelectedProfileByPlatform] = useState<
    Partial<Record<SocialPostKey, string>>
  >({});
  const [sendingKey, setSendingKey] = useState<SocialPostKey | null>(null);

  const socialPro = hasSocialProAddon(purchasedTemplates);
  const canPublish = canDirectPublishSocial(subscriptionTier, subscriptionStatus, socialPro);
  const canSchedule = canScheduleSocialPosts(subscriptionTier, subscriptionStatus, socialPro);

  const loadBufferState = () => {
    fetch('/api/social/buffer/status', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setBufferConnected(Boolean(data.connected));
        setNeedsReconnect(Boolean(data.needsReconnect));
      })
      .catch(() => {});

    if (!canPublish) return;

    fetch('/api/social/buffer/profiles', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401 && data.needsReconnect) {
          setBufferConnected(false);
          setNeedsReconnect(true);
          setBufferProfiles([]);
          return;
        }
        if (!r.ok) return;
        setBufferConnected(Boolean(data.connected));
        setNeedsReconnect(false);
        setBufferProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!open || !canPublish) return;
    loadBufferState();
  }, [open, canPublish]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    fetch('/api/social/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt, blueprint }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Generation failed');
        setPosts(data.posts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Generation failed'))
      .finally(() => setLoading(false));
  }, [open, prompt, blueprint]);

  const copyPost = async (key: SocialPostKey, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setError('Clipboard copy failed');
    }
  };

  const sendToBuffer = async (key: SocialPostKey, text: string) => {
    if (!BUFFER_PLATFORMS.has(key)) return;

    const matches = profilesForPlatform(bufferProfiles, key);
    const profileId = selectedProfileByPlatform[key] ?? matches[0]?.id;

    if (matches.length > 1 && !profileId) {
      setError(`Pick a Buffer account for ${SOCIAL_POST_LABELS[key]}`);
      return;
    }

    setSendingKey(key);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/social/buffer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: key,
          text,
          profileId,
          scheduledAt: canSchedule && scheduleDate ? scheduleDate : null,
        }),
      });

      const data = await res.json();

      if (res.status === 401 && data.needsReconnect) {
        setNeedsReconnect(true);
        setBufferConnected(false);
        throw new Error(data.error || 'Buffer connection expired');
      }

      if (res.status === 409 && data.code === 'multiple_profiles') {
        throw new Error(data.error);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send to Buffer');
      }

      setSuccess(data.message || `Sent to Buffer (${SOCIAL_POST_LABELS[key]})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send to Buffer');
    } finally {
      setSendingKey(null);
    }
  };

  const bufferReady = useMemo(
    () => bufferConnected && bufferProfiles.length > 0,
    [bufferConnected, bufferProfiles]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
        aria-label="Close social publisher"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Share to Social</h2>
            <p className="text-[10px] text-nisk-muted mt-0.5">
              Generate, copy, or send to Buffer
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-nisk-muted hover:text-[var(--foreground)] px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {canPublish && (
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
            <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-2">Buffer</p>
            {needsReconnect ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--error)]">
                  Your Buffer connection has expired — reconnect to send posts.
                </p>
                <a
                  href="/api/social/buffer/auth"
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20"
                >
                  Reconnect Buffer
                </a>
              </div>
            ) : bufferReady ? (
              <p className="text-xs text-[var(--copper-melt)]">
                Buffer connected — {bufferProfiles.length} channel
                {bufferProfiles.length === 1 ? '' : 's'} ready
              </p>
            ) : bufferConnected ? (
              <p className="text-xs text-nisk-muted">
                Buffer connected — add social channels in Buffer to publish.
              </p>
            ) : (
              <a
                href="/api/social/buffer/auth"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--copper-primary)]/40 bg-[var(--copper-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/20"
              >
                Connect Buffer
              </a>
            )}
          </div>
        )}

        {canSchedule && bufferReady && (
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
            <label className="text-[10px] uppercase tracking-wider text-nisk-muted block mb-1.5">
              Schedule in Buffer (optional)
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full bg-[var(--code-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)]"
            />
            <p className="text-[10px] text-nisk-muted mt-1">
              Leave empty to use Buffer&apos;s next available slot
            </p>
          </div>
        )}

        {!canPublish && !socialPro && (
          <div className="shrink-0 px-4 py-2 border-b border-[var(--border)] bg-[var(--code-bg)]">
            <p className="text-[10px] text-nisk-muted">
              Copy-paste on all plans. Direct publish on Agency+ or{' '}
              <a href="/pricing" className="text-[var(--copper-melt)] hover:underline">
                Social Pro ($19/mo)
              </a>
              .
            </p>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {loading && (
            <p className="text-sm text-nisk-muted text-center py-8">Generating posts…</p>
          )}
          {error && (
            <p className="text-sm text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
          {posts &&
            PLATFORMS.map((key) => {
              const bufferMatches = profilesForPlatform(bufferProfiles, key);
              const showBuffer = canPublish && BUFFER_PLATFORMS.has(key) && bufferReady;
              const multiBuffer = bufferMatches.length > 1;

              return (
                <article
                  key={key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)]/60 flex-wrap">
                    <h3 className="text-xs font-semibold text-[var(--code-keyword)]">
                      {SOCIAL_POST_LABELS[key]}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {showBuffer && multiBuffer && (
                        <select
                          value={selectedProfileByPlatform[key] ?? bufferMatches[0]?.id ?? ''}
                          onChange={(e) =>
                            setSelectedProfileByPlatform((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="text-[10px] max-w-[140px] rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5"
                          title="Buffer account"
                        >
                          {bufferMatches.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.formatted_username || p.service_username || p.service}
                            </option>
                          ))}
                        </select>
                      )}
                      {showBuffer && (
                        <button
                          type="button"
                          disabled={sendingKey === key || bufferMatches.length === 0}
                          onClick={() => void sendToBuffer(key, posts[key])}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--copper-primary)]/40 text-[var(--copper-melt)] hover:bg-[var(--copper-primary)]/10 disabled:opacity-50"
                        >
                          {sendingKey === key ? 'Sending…' : 'Send to Buffer'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyPost(key, posts[key])}
                        className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--border)] text-nisk-muted hover:text-[var(--foreground)] hover:border-[var(--copper-primary)]/40"
                      >
                        {copiedKey === key ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="px-3 py-2.5 text-[11px] text-[var(--code-tag)] leading-relaxed whitespace-pre-wrap font-mono">
                    {posts[key]}
                  </p>
                </article>
              );
            })}
        </div>
      </aside>
    </div>
  );
}

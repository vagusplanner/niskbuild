"use client";

import { useEffect, useState } from 'react';
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

const PLATFORMS: SocialPostKey[] = [
  'instagram',
  'linkedin',
  'twitter',
  'facebook',
  'google_business',
  'tiktok_script',
  'whatsapp',
];

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
  const [posts, setPosts] = useState<SocialPosts | null>(null);
  const [copiedKey, setCopiedKey] = useState<SocialPostKey | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  const [bufferConnected, setBufferConnected] = useState(false);

  const socialPro = hasSocialProAddon(purchasedTemplates);
  const canPublish = canDirectPublishSocial(subscriptionTier, subscriptionStatus, socialPro);
  const canSchedule = canScheduleSocialPosts(subscriptionTier, subscriptionStatus, socialPro);

  useEffect(() => {
    if (!open || !canPublish) return;
    fetch('/api/social/buffer/status', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        setBufferConnected(Boolean(data.connected));
      })
      .catch(() => {});
  }, [open, canPublish]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
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
            <p className="text-[10px] text-nisk-muted mt-0.5">Copy posts for every platform</p>
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
            {bufferConnected ? (
              <p className="text-xs text-[var(--copper-melt)]">Buffer connected — schedule from Agency+ / Social Pro.</p>
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

        {canSchedule && (
          <div className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
            <label className="text-[10px] uppercase tracking-wider text-nisk-muted block mb-1.5">
              Schedule publish
            </label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full bg-[var(--code-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)]"
            />
            {scheduleDate && (
              <p className="text-[10px] text-[var(--copper-melt)] mt-1">
                Scheduled — direct publish queue coming soon
              </p>
            )}
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
          {posts &&
            PLATFORMS.map((key) => (
              <article
                key={key}
                className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]/60">
                  <h3 className="text-xs font-semibold text-[var(--code-keyword)]">
                    {SOCIAL_POST_LABELS[key]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyPost(key, posts[key])}
                    className="text-[10px] px-2 py-0.5 rounded-md border border-[var(--border)] text-nisk-muted hover:text-[var(--foreground)] hover:border-[var(--copper-primary)]/40"
                  >
                    {copiedKey === key ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="px-3 py-2.5 text-[11px] text-[var(--code-tag)] leading-relaxed whitespace-pre-wrap font-mono">
                  {posts[key]}
                </p>
              </article>
            ))}
        </div>
      </aside>
    </div>
  );
}

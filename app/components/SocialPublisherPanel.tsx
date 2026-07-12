'use client';

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
  const [success, setSuccess] = useState<string | null>(null);
  const [posts, setPosts] = useState<SocialPosts | null>(null);
  const [copiedKey, setCopiedKey] = useState<SocialPostKey | null>(null);

  const socialPro = hasSocialProAddon(purchasedTemplates);
  const canPublish = canDirectPublishSocial(subscriptionTier, subscriptionStatus, socialPro);
  const canSchedule = canScheduleSocialPosts(subscriptionTier, subscriptionStatus, socialPro);

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
              Generate and copy posts — direct publish coming soon
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

        <div className="shrink-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]/50">
          <p className="text-[10px] uppercase tracking-wider text-nisk-muted mb-1.5">
            Buffer publish
          </p>
          <p className="text-xs text-nisk-muted">
            Connect Buffer and schedule posts from the builder is on the roadmap
            {canPublish || canSchedule ? ' for your plan' : ''}.
          </p>
          <span
            className="mt-2 inline-block rounded-md border border-[var(--copper-primary)]/35 bg-[var(--copper-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--copper-melt)]"
            aria-label="Coming soon"
          >
            Coming soon
          </span>
        </div>

        <div className="shrink-0 px-4 py-2 border-b border-[var(--border)] bg-[var(--code-bg)]">
          <p className="text-[10px] text-nisk-muted">
            Generate AI drafts and copy them to your networks today. One-click Buffer publish will
            return when customer OAuth is ready.
          </p>
        </div>

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
            PLATFORMS.map((key) => (
              <article
                key={key}
                className="rounded-xl border border-[var(--border)] bg-[var(--code-bg)] overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)]/60 flex-wrap">
                  <h3 className="text-xs font-semibold text-[var(--code-keyword)]">
                    {SOCIAL_POST_LABELS[key]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => void copyPost(key, posts[key])}
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

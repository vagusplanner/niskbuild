'use client';

import { useState } from 'react';

interface DocsFeedbackProps {
  articleId: string;
}

export default function DocsFeedback({ articleId }: DocsFeedbackProps) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const submit = async (helpful: boolean) => {
    setSaving(true);
    try {
      const res = await fetch('/api/docs/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          helpful,
          comment: comment.trim() || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(helpful);
        setShowComment(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-nisk">
      <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Was this helpful?</h2>
      {submitted === null ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit(true)}
              className="px-4 py-2 rounded-xl border border-nisk bg-[var(--surface)] hover:border-[var(--copper-primary)]/50 hover:text-[var(--copper-melt)] transition-colors text-sm font-medium"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowComment(true);
                void submit(false);
              }}
              className="px-4 py-2 rounded-xl border border-nisk bg-[var(--surface)] hover:border-[var(--copper-primary)]/50 transition-colors text-sm font-medium"
            >
              No
            </button>
          </div>
          {showComment && (
            <div>
              <label htmlFor="doc-feedback-comment" className="block text-sm text-nisk-muted mb-2">
                What could we improve? (optional)
              </label>
              <textarea
                id="doc-feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-nisk bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                placeholder="Tell us what was missing or confusing…"
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-nisk-muted">
          Thanks for your feedback{submitted ? '!' : ' — we will use this to improve the docs.'}
        </p>
      )}
    </section>
  );
}

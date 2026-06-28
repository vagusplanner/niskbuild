'use client';

import { useState } from 'react';
import Link from 'next/link';
import Layout from '@/app/components/Layout';

export default function NpsPage() {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (score === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ score, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-lg mx-auto py-12 px-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          How likely are you to recommend NiskBuild?
        </h1>
        <p className="text-sm text-nisk-muted mb-8">0 = not likely · 10 = very likely</p>

        {done ? (
          <p className="text-[var(--copper-melt)]">Thank you — your feedback helps us improve.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setScore(i)}
                  className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                    score === i
                      ? 'border-[var(--copper-primary)] bg-[var(--copper-primary)]/20 text-[var(--copper-melt)]'
                      : 'border-nisk text-nisk-muted hover:border-[var(--copper-primary)]/40'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional — what could we do better?"
              rows={3}
              className="w-full mb-4 rounded-xl border border-nisk bg-[var(--surface)] px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-[var(--error)] mb-3">{error}</p>}
            <button
              type="button"
              disabled={score === null || submitting}
              onClick={() => void submit()}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </>
        )}

        <p className="mt-8 text-xs text-nisk-muted">
          <Link href="/dashboard" className="text-[var(--copper-melt)] hover:underline">
            ← Back to dashboard
          </Link>
        </p>
      </div>
    </Layout>
  );
}

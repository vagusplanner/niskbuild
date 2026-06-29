'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Layout from '@/app/components/Layout';

function PassiveForm() {
  const params = useSearchParams();
  const userId = params.get('user') || '';
  const token = params.get('token') || '';
  const score = params.get('score') || '8';

  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: Number(score),
          comment: feedback.trim(),
          user: userId,
          token,
        }),
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
    <div className="max-w-lg mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Thank you!</h1>
      <p className="text-nisk-muted mb-6">What would make NiskBuild a 10 for you?</p>

      {done ? (
        <p className="text-[var(--copper-melt)]">Thanks — we read every response.</p>
      ) : (
        <>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="One thing we could improve…"
            rows={4}
            className="w-full mb-4 rounded-xl border border-nisk bg-[var(--surface)] px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-[var(--error)] mb-3">{error}</p>}
          <button
            type="button"
            disabled={!feedback.trim() || submitting}
            onClick={() => void submit()}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send feedback'}
          </button>
        </>
      )}

      <p className="mt-8 text-xs text-nisk-muted">
        <Link href="/dashboard" className="text-[var(--copper-melt)] hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  );
}

export default function NpsPassivePage() {
  return (
    <Layout>
      <Suspense fallback={<div className="py-12 text-center text-nisk-muted">Loading…</div>}>
        <PassiveForm />
      </Suspense>
    </Layout>
  );
}

'use client';

import { useState } from 'react';
import { signInWithSso } from '@/lib/auth';

type Props = {
  nextPath: string;
};

export default function SsoSignInForm({ nextPath }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sso-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SSO lookup failed');
      if (!data.matched) {
        setError(
          data.message ||
            'No SSO is configured for that email domain. Use Google or email/password instead.'
        );
        setLoading(false);
        return;
      }
      await signInWithSso({
        domain: data.domain,
        providerId: data.providerId,
        nextPath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSO sign-in failed');
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mt-3 rounded-lg border border-nisk bg-[var(--iron-dark)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-white/5"
      >
        Sign in with SSO
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-3">
      <p className="text-xs text-nisk-muted">
        Enter your work email. We’ll send you to your company’s identity provider if SSO is set up.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-lg border border-nisk bg-[var(--iron-dark)] px-3 py-2 text-sm"
        autoComplete="username"
      />
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex-1 rounded-lg btn-primary px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? 'Continuing…' : 'Continue with SSO'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError('');
          }}
          className="rounded-lg btn-secondary px-3 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';

type LandingWaitlistProps = {
  id?: string;
  compact?: boolean;
};

export default function LandingWaitlist({ id = 'newsletter', compact = false }: LandingWaitlistProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'landing' }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail('');
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id={id} className={compact ? '' : 'max-w-md mx-auto'}>
      {!compact && (
        <p className="text-nisk-muted text-sm mb-3 text-center">
          Get product updates — no spam, unsubscribe anytime.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-4 py-3 rounded-xl glass-input text-[var(--foreground)] placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-3 rounded-xl disabled:opacity-50 shrink-0"
        >
          {loading ? 'Joining…' : 'Join Waitlist'}
        </button>
      </form>
      {success && (
        <p className="mt-3 text-sm text-[var(--success)] text-center">
          You&apos;re on the waitlist — we&apos;ll be in touch.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-[var(--error)] text-center">{error}</p>
      )}
    </div>
  );
}

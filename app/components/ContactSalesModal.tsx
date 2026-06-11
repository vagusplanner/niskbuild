"use client";

import { useEffect, useState } from 'react';
import { getSafeSession } from '@/lib/supabaseSession';
import type { PricingTier } from '@/lib/pricing-tiers';

interface ContactSalesModalProps {
  tier: PricingTier | null;
  onClose: () => void;
}

export default function ContactSalesModal({ tier, onClose }: ContactSalesModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!tier) return;

    setName('');
    setCompany('');
    setMessage('');
    setError(null);
    setSuccess(false);

    getSafeSession().then((session) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
      } else {
        setEmail('');
      }
    });
  }, [tier]);

  useEffect(() => {
    if (!tier) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tier, onClose]);

  if (!tier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/contact-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: tier.tier,
          name,
          email,
          company,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-nisk-card border border-nisk shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-sales-title"
      >
        <div className="p-6 border-b border-nisk">
          <button
            type="button"
            onClick={onClose}
            className="float-right text-nisk-muted hover:text-white text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
          <h2 id="contact-sales-title" className="text-xl font-bold text-white pr-8">
            Contact Sales — {tier.name}
          </h2>
          <p className="text-nisk-muted text-sm mt-1">
            {tier.price}
            {tier.period} · {tier.description}
          </p>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-white font-medium mb-2">Inquiry sent</p>
            <p className="text-nisk-muted text-sm mb-6">
              Our team will reply to <span className="text-white">{email}</span> within one business day.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-nisk-muted text-sm">
              Tell us about your team and we&apos;ll follow up by email — no need to open your mail app.
            </p>

            <div>
              <label htmlFor="sales-name" className="block text-sm text-nisk-muted mb-1">
                Name *
              </label>
              <input
                id="sales-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-nisk text-white text-sm focus:outline-none focus:border-[var(--primary)]"
                placeholder="Your name"
              />
            </div>

            <div>
              <label htmlFor="sales-email" className="block text-sm text-nisk-muted mb-1">
                Work email *
              </label>
              <input
                id="sales-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-nisk text-white text-sm focus:outline-none focus:border-[var(--primary)]"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="sales-company" className="block text-sm text-nisk-muted mb-1">
                Company
              </label>
              <input
                id="sales-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-nisk text-white text-sm focus:outline-none focus:border-[var(--primary)]"
                placeholder="Agency or company name"
              />
            </div>

            <div>
              <label htmlFor="sales-message" className="block text-sm text-nisk-muted mb-1">
                How can we help? *
              </label>
              <textarea
                id="sales-message"
                required
                minLength={10}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-elevated)] border border-nisk text-white text-sm resize-none focus:outline-none focus:border-[var(--primary)]"
                placeholder="Team size, use case, timeline..."
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-sm transition-colors"
            >
              {submitting ? 'Sending...' : 'Send inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

type ContactFormProps = {
  variant?: 'landing' | 'compact';
  defaultCategory?: string;
  endpoint?: '/api/support/contact' | '/api/support/tickets';
  onSuccess?: () => void;
  showCategory?: boolean;
  requireAuth?: boolean;
};

const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical support' },
  { value: 'sales', label: 'Sales' },
  { value: 'feature', label: 'Feature request' },
  { value: 'bug', label: 'Bug report' },
];

export default function ContactForm({
  variant = 'landing',
  defaultCategory = 'general',
  endpoint = '/api/support/contact',
  onSuccess,
  showCategory = true,
}: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, subject, category, message }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.upgrade) {
          setError(data.error);
          return;
        }
        setError(data.error || 'Failed to send message');
        return;
      }

      setSuccess(data.message || 'Message sent — we will reply soon.');
      setSubject('');
      setMessage('');
      onSuccess?.();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCompact = variant === 'compact';

  return (
    <form onSubmit={handleSubmit} className={isCompact ? 'space-y-3' : 'space-y-4'}>
      {endpoint === '/api/support/contact' && (
        <div className={`grid ${isCompact ? 'grid-cols-1' : 'sm:grid-cols-2'} gap-3`}>
          <div>
            <label className="block text-xs text-nisk-muted mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs text-nisk-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
              placeholder="you@company.com"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs text-nisk-muted mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
          placeholder="How can we help?"
        />
      </div>

      {showCategory && (
        <div>
          <label className="block text-xs text-nisk-muted mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs text-nisk-muted mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={isCompact ? 4 : 5}
          className="w-full px-4 py-2.5 rounded-xl glass-input text-sm resize-none"
          placeholder="Tell us what you need…"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send Message'}
      </button>

      {success && (
        <p className="text-sm text-[var(--success)]">{success}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
    </form>
  );
}

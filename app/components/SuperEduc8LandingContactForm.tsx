'use client';

import { useState } from 'react';

/**
 * Public contact form for the SuperEduc8 landing (Teacher/School + general).
 * Posts to /api/support/contact — no login required.
 */
const CATEGORIES = [
  { value: 'sales', label: 'Sales / Pricing' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'general', label: 'General Inquiry' },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]['value'];

export default function SuperEduc8LandingContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CategoryValue>('sales');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label ?? 'General Inquiry';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const resolvedSubject =
      subject.trim() || `${categoryLabel} — SuperEduc8 landing`;

    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          subject: resolvedSubject,
          category,
          message,
          product: 'supereduc8',
          source: 'supereduc8_landing',
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to send message');
        return;
      }
      setSuccess(data.message || 'Thanks — we received your message and will reply soon.');
      setMessage('');
      setSubject('');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="se8-contact-form">
      <div className="se8-contact-grid">
        <label className="se8-contact-field">
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>
        <label className="se8-contact-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@school.org"
            autoComplete="email"
          />
        </label>
      </div>
      <label className="se8-contact-field">
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryValue)}
          required
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="se8-contact-field">
        <span>Subject <span className="se8-contact-optional">(optional)</span></span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={`e.g. ${categoryLabel} for our school`}
        />
      </label>
      <label className="se8-contact-field">
        <span>Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          rows={5}
          placeholder="Tell us about your classroom or school — year groups, curriculum, and what you need."
        />
      </label>
      <button type="submit" className="se8-btn se8-btn-primary" disabled={loading}>
        {loading ? 'Sending…' : 'Send message'}
      </button>
      {error ? <p className="se8-contact-error">{error}</p> : null}
      {success ? <p className="se8-contact-success">{success}</p> : null}
    </form>
  );
}

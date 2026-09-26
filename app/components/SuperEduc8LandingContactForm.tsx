'use client';

import { useState } from 'react';

/**
 * Public Teacher/School + general contact form for the SuperEduc8 landing.
 * Posts to the shared /api/support/contact endpoint (no login required).
 */
export default function SuperEduc8LandingContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Teacher / School inquiry');
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
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          email,
          subject,
          category: 'sales',
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
        <span>Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={3}
          placeholder="Teacher / School inquiry"
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

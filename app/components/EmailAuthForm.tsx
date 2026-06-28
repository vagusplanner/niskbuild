"use client";

import { useState } from 'react';
import { signInWithEmail, signUpWithEmail, requestPasswordReset } from '@/lib/auth';
import { AGE_RANGE_OPTIONS, AGE_RANGE_LABELS } from '@/lib/age-range';

interface EmailAuthFormProps {
  nextPath?: string;
  onSuccess?: () => void;
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={6}
        className="w-full px-4 py-2.5 pr-11 rounded-lg glass-input placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] text-sm"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-nisk-muted hover:text-[var(--foreground)] rounded-md"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function EmailAuthForm({ nextPath = '/pricing', onSuccess }: EmailAuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [town, setTown] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Enter your email address first.');
        }
        await requestPasswordReset(email);
        setMessage('Check your email for a password reset link.');
        return;
      }

      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onSuccess?.();
        window.location.href = nextPath;
      } else {
        const data = await signUpWithEmail(email, password);
        if (data.session) {
          void fetch('/api/analytics/record-signup', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ageRange: ageRange || undefined,
              town: town.trim() || undefined,
            }),
          });
          onSuccess?.();
          window.location.href = nextPath;
        } else {
          setMessage('Check your email to confirm your account, then sign in.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode !== 'forgot' && (
        <div className="flex rounded-lg border border-nisk overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 transition-colors ${mode === 'signin' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-[var(--foreground)]'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 transition-colors ${mode === 'signup' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-[var(--foreground)]'}`}
          >
            Sign Up
          </button>
        </div>
      )}

      {mode === 'forgot' && (
        <p className="text-xs text-nisk-muted text-center">
          Enter your email and we&apos;ll send a reset link.
        </p>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        className="w-full px-4 py-2.5 rounded-lg glass-input placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] text-sm"
      />

      {mode !== 'forgot' && (
        <>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            placeholder="Password (min. 6 characters)"
          />
          {mode === 'signin' && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setMessage('');
                }}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'signup' && (
        <>
          <div>
            <label className="text-[10px] text-nisk-muted block mb-1">
              Age range <span className="opacity-70">(optional — helps anonymous demand trends)</span>
            </label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg glass-input text-sm bg-transparent"
            >
              <option value="">Prefer not to say</option>
              {AGE_RANGE_OPTIONS.filter((opt) => opt !== 'prefer not to say').map((opt) => (
                <option key={opt} value={opt}>
                  {AGE_RANGE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-nisk-muted block mb-1">
              Town / city <span className="opacity-70">(optional — coarse location only)</span>
            </label>
            <input
              type="text"
              value={town}
              onChange={(e) => setTown(e.target.value)}
              placeholder="e.g. London"
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-lg glass-input placeholder-[var(--placeholder)] focus:outline-none focus:border-[var(--primary)] text-sm"
            />
          </div>
          <p className="text-[10px] text-nisk-muted leading-snug">
            We store age range buckets only — never your exact birthdate. Town is used for
            aggregate analytics, not precise tracking.
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg btn-primary font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading
          ? 'Please wait...'
          : mode === 'forgot'
            ? 'Send reset link'
            : mode === 'signin'
              ? 'Sign In with Email'
              : 'Create Account'}
      </button>

      {mode === 'forgot' && (
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError('');
            setMessage('');
          }}
          className="w-full text-xs text-nisk-muted hover:text-[var(--foreground)]"
        >
          ← Back to sign in
        </button>
      )}

      {error && <p className="text-xs text-center text-[var(--error)]">{error}</p>}
      {message && <p className="text-xs text-center text-[var(--success)]">{message}</p>}
    </form>
  );
}

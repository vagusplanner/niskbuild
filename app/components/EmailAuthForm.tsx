"use client";

import { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/lib/auth';

interface EmailAuthFormProps {
  nextPath?: string;
  onSuccess?: () => void;
}

export default function EmailAuthForm({ nextPath = '/pricing', onSuccess }: EmailAuthFormProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        onSuccess?.();
        window.location.href = nextPath;
      } else {
        const data = await signUpWithEmail(email, password);
        if (data.session) {
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
      <div className="flex rounded-lg border border-nisk overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
          className={`flex-1 py-2 transition-colors ${mode === 'signin' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-white'}`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
          className={`flex-1 py-2 transition-colors ${mode === 'signup' ? 'bg-[var(--primary)] text-white' : 'text-nisk-muted hover:text-white'}`}
        >
          Sign Up
        </button>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        className="w-full px-4 py-2.5 rounded-lg bg-nisk border border-nisk text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] text-sm"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min. 6 characters)"
        required
        minLength={6}
        className="w-full px-4 py-2.5 rounded-lg bg-nisk border border-nisk text-white placeholder-gray-500 focus:outline-none focus:border-[var(--primary)] text-sm"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[var(--surface-elevated)] border border-nisk hover:border-[var(--primary)] text-white font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading
          ? 'Please wait...'
          : mode === 'signin'
            ? 'Sign In with Email'
            : 'Create Account'}
      </button>

      {error && <p className="text-xs text-center text-[var(--error)]">{error}</p>}
      {message && <p className="text-xs text-center text-[var(--success)]">{message}</p>}
    </form>
  );
}

"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/auth';
import GoogleSignInButton from './GoogleSignInButton';
import EmailAuthForm from './EmailAuthForm';
import NiskBuildLogo from './NiskBuildLogo';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  nextPath?: string;
  title?: string;
  subtitle?: string;
}

export default function AuthModal({
  open,
  onClose,
  nextPath = '/pricing',
  title = 'Sign in to NiskBuild',
  subtitle = 'Sign in or create an account, then choose a plan to access the builder.',
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle(nextPath);
    } catch {
      setError('Google sign in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nisk-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <NiskBuildLogo variant="lockup" size="md" />
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold text-white mb-2 text-center">{title}</h2>
          <p className="text-nisk-muted text-sm">{subtitle}</p>
        </div>

        <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />

        {error && <p className="mt-3 text-sm text-center text-[var(--error)]">{error}</p>}

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-nisk-muted">or continue with email</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <EmailAuthForm nextPath={nextPath} onSuccess={onClose} />

        <p className="mt-6 text-center text-xs text-nisk-muted">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline" onClick={onClose}>Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline" onClick={onClose}>Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

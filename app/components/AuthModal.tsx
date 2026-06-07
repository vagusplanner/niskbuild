"use client";

import { useState } from 'react';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/auth';
import GoogleSignInButton from './GoogleSignInButton';

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
  nextPath = '/builder',
  title = 'Sign in to NiskBuild',
  subtitle = 'Create an account or sign in to access the builder, marketplace, and exports.',
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
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-nisk-muted hover:text-white transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">NB</span>
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold text-white mb-2">
            {title}
          </h2>
          <p className="text-nisk-muted text-sm">{subtitle}</p>
        </div>

        <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />

        {error && (
          <p className="mt-4 text-sm text-center text-[var(--error)]">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-nisk-muted">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline" onClick={onClose}>
            Terms
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline" onClick={onClose}>
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}

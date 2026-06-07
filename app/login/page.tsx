"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import AppMenu from '@/app/components/AppMenu';
import GoogleSignInButton from '@/app/components/GoogleSignInButton';

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/builder';

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Google sign in failed. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    getSafeSession().then((session) => {
      if (session?.user) {
        router.replace(next);
      } else {
        setChecking(false);
      }
    });
  }, [router, next]);

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle(next);
    } catch {
      setError('Google sign in failed. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold">NB</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to NiskBuild</h1>
          <p className="text-nisk-muted text-sm">
            Create an account or sign in to access the builder, marketplace, and exports.
          </p>
        </div>

        <GoogleSignInButton onClick={handleSignIn} loading={loading} />

        {error && (
          <p className="mt-4 text-sm text-center text-[var(--error)]">{error}</p>
        )}

        <p className="mt-6 text-center text-xs text-nisk-muted">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</Link>.
        </p>

        <p className="mt-4 text-center text-sm text-nisk-muted">
          <Link href="/landing" className="text-[var(--primary)] hover:underline">
            ← Back to Landing
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppMenu variant="app" showAuth={false} />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}

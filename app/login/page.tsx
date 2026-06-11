"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import AppTopNav from '@/app/components/AppTopNav';
import GoogleSignInButton from '@/app/components/GoogleSignInButton';
import EmailAuthForm from '@/app/components/EmailAuthForm';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/pricing';

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Sign in failed. Please try again with Google or email.');
    }
    const reason = searchParams.get('reason');
    if (reason === 'session_limit') {
      setError('Session limit reached on your plan. Sign out another device in Settings → Security, then sign in again.');
    }
    if (reason === 'session_expired') {
      setError('Your session expired. Please sign in again.');
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

  const handleGoogleSignIn = async () => {
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
    <div className="flex-1 flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <NiskBuildLogo variant="image" size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">Sign in to NiskBuild</h1>
          <p className="text-nisk-muted text-sm">
            Sign in or create an account. After that, choose a plan to unlock the builder and marketplace.
          </p>
        </div>

        <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} label="Sign in with Google" />

        {error && <p className="mt-4 text-sm text-center text-[var(--error)]">{error}</p>}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-nisk-muted">or continue with email</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <EmailAuthForm nextPath={next} />

        <p className="mt-6 text-center text-xs text-nisk-muted">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</Link>.
        </p>

        <p className="mt-4 text-center text-sm text-nisk-muted">
          <Link href="/landing" className="text-[var(--primary)] hover:underline">← Back to Landing</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-nisk flex flex-col">
      <AppTopNav variant="marketing" />
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

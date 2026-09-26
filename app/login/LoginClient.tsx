"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/auth';
import { getSafeSession } from '@/lib/supabaseSession';
import GoogleSignInButton from '@/app/components/GoogleSignInButton';
import EmailAuthForm from '@/app/components/EmailAuthForm';
import SsoSignInForm from '@/app/components/SsoSignInForm';
import NiskBuildLogo from '@/app/components/NiskBuildLogo';
import SuperEduc8Logo from '@/app/components/SuperEduc8Logo';
import AuthProductShell from '@/app/components/auth/AuthProductShell';
import {
  AUTH_BRAND_COPY,
  type AuthProductBrand,
} from '@/app/components/auth/auth-brand';
import { sanitizeNextPath, sanitizeSuperEduc8NextPath } from '@/lib/post-auth-redirect';

function LoginContent({ brand }: { brand: AuthProductBrand }) {
  const copy = AUTH_BRAND_COPY[brand];
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = sanitizeNextPath(searchParams.get('next')) || copy.defaultNext;
  const next =
    brand === 'supereduc8' ? sanitizeSuperEduc8NextPath(rawNext) : rawNext;

  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Sign in failed. Please try again with Google or email.');
    }
    const reason = searchParams.get('reason');
    if (reason === 'session_limit') {
      setError(
        'Session limit reached on your plan. Sign out another device in Settings → Security, then sign in again.'
      );
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
    <div className="flex-1 flex items-center justify-center px-4 pt-8 pb-12 sm:pt-16">
      <div className="w-full max-w-md bg-nisk-card border border-nisk rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            {brand === 'supereduc8' ? (
              <SuperEduc8Logo variant="lockup" size="xl" />
            ) : (
              <NiskBuildLogo variant="lockup" size="xl" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 text-center">
            {copy.signInTitle}
          </h1>
          <p className="text-nisk-muted text-sm">{copy.signInSubtitle}</p>
        </div>

        <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} label="Sign in with Google" />

        {brand === 'niskbuild' ? <SsoSignInForm nextPath={next} /> : null}

        {error && <p className="mt-4 text-sm text-center text-[var(--error)]">{error}</p>}

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-nisk-muted">or continue with email</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <EmailAuthForm
          nextPath={next}
          productName={copy.productName}
          dedicatedSignupHref={copy.dedicatedSignupHref}
        />

        <p className="mt-6 text-center text-xs text-nisk-muted">
          By signing in, you agree to our{' '}
          <Link href={copy.termsHref} className="text-[var(--primary)] hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href={copy.privacyHref} className="text-[var(--primary)] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        {copy.backHref && copy.backLabel ? (
          <p className="mt-4 text-center text-sm text-nisk-muted">
            <Link href={copy.backHref} className="text-[var(--primary)] hover:underline">
              {copy.backLabel}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function LoginClient({ brand }: { brand: AuthProductBrand }) {
  return (
    <AuthProductShell brand={brand}>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <LoginContent brand={brand} />
      </Suspense>
    </AuthProductShell>
  );
}

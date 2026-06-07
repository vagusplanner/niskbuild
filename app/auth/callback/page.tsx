"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { clearStaleAuth, getSafeSession } from '@/lib/supabaseSession';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      const next = searchParams.get('next') || '/builder';
      const code = searchParams.get('code');
      const authError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // OAuth provider returned an error
      if (authError) {
        await clearStaleAuth();
        setError(errorDescription || authError);
        setTimeout(() => router.replace('/login?error=auth_failed'), 2500);
        return;
      }

      if (code) {
        setStatus('Exchanging authorization code...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          await clearStaleAuth();
          setError(exchangeError.message);
          setTimeout(() => router.replace('/login?error=auth_failed'), 2500);
          return;
        }
      } else {
        // No code — check if session already exists (e.g. hash-based flow)
        const session = await getSafeSession();
        if (!session) {
          await clearStaleAuth();
          setError('No authorization code received.');
          setTimeout(() => router.replace('/login?error=auth_failed'), 2500);
          return;
        }
      }

      setStatus('Redirecting to builder...');
      const destination = next.includes('?') ? `${next}&welcome=1` : `${next}?welcome=1`;
      router.replace(destination);
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-nisk flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-[var(--error)] mb-2 font-medium">Sign in failed</p>
            <p className="text-nisk-muted text-sm mb-2">{error}</p>
            <p className="text-nisk-muted text-xs">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-nisk-muted text-sm">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-nisk flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

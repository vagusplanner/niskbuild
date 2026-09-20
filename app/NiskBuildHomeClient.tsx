'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Rescue password-recovery links that land on Site URL (/).
 * Shared Supabase Auth uses Site URL=https://www.niskbuild.com; dashboard-triggered
 * resets often omit redirectTo and dump tokens on the homepage instead of /reset-password.
 */
function isAuthRecoveryLanding(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  if (hash.includes('type=recovery') || hash.includes('access_token')) return true;
  if (search.includes('type=recovery')) return true;
  if (new URLSearchParams(search).get('code')) return true;
  return false;
}

/** NiskBuild site root — recovery rescue, then marketing landing. */
export default function NiskBuildHomeClient() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthRecoveryLanding()) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const code = new URLSearchParams(search).get('code');
      if (code) {
        router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`);
        return;
      }
      router.replace(`/reset-password${search}${hash}`);
      return;
    }
    router.replace('/landing-v2');
  }, [router]);

  return (
    <div className="min-h-screen bg-nisk flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-nisk-muted">Loading NiskBuild...</p>
      </div>
    </div>
  );
}

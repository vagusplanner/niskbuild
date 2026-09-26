import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectOrigin } from '@/lib/canonical-url';
import {
  resolvePostAuthProduct,
  sanitizeNextPath,
  sanitizeSuperEduc8NextPath,
} from '@/lib/post-auth-redirect';
import { safeLocalStorageGet, safeLocalStorageRemove, safeLocalStorageSet } from '@/lib/safe-storage';

function getOrigin() {
  if (typeof window === 'undefined') return getAuthRedirectOrigin(null);
  // Prefer the custom domain for OAuth/email redirectTo so Supabase does not
  // leave users on niskbuild.vercel.app when Site URL / allow-list is mis-set.
  return getAuthRedirectOrigin(window.location.origin);
}

/** Build /auth/callback URL with product-aware next + SE8 product tag. */
function buildAuthCallbackUrl(nextPath: string, extra?: Record<string, string>): string {
  const origin = getOrigin();
  const product = resolvePostAuthProduct(origin);
  const safeNext =
    product === 'supereduc8'
      ? sanitizeSuperEduc8NextPath(nextPath)
      : sanitizeNextPath(nextPath) || '/pricing';
  const params = new URLSearchParams({ next: safeNext, ...extra });
  if (product === 'supereduc8') {
    // Survives Supabase Site URL fallback onto niskbuild.com so the callback
    // can bounce the session back to SuperEduc8 instead of NiskBuild pricing.
    params.set('product', 'supereduc8');
  }
  return `${origin}/auth/callback?${params.toString()}`;
}

export async function signInWithGoogle(nextPath = '/pricing') {
  const supabase = createClient();
  const callbackUrl = buildAuthCallbackUrl(nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) throw error;
}

export async function signInWithSso(params: {
  domain?: string;
  providerId?: string;
  nextPath?: string;
}) {
  const supabase = createClient();
  const nextPath = params.nextPath || '/dashboard';
  const callbackUrl = buildAuthCallbackUrl(nextPath, { sso: '1' });

  const options = {
    redirectTo: callbackUrl,
  };

  const { data, error } = params.providerId
    ? await supabase.auth.signInWithSSO({
        providerId: params.providerId,
        options,
      })
    : await supabase.auth.signInWithSSO({
        domain: params.domain!,
        options,
      });

  if (error) throw error;
  if (data?.url) {
    window.location.href = data.url;
    return;
  }
  throw new Error('SSO redirect URL was not returned. Check that SAML is enabled for this project.');
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  const product = resolvePostAuthProduct(getOrigin());
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(
        product === 'supereduc8' ? '/dashboard' : '/pricing'
      ),
    },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${getOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export function getOnboardingKey(userId: string) {
  return `niskbuild_onboarding_${userId}`;
}

export function hasCompletedOnboarding(userId: string) {
  if (typeof window === 'undefined') return true;
  return safeLocalStorageGet(getOnboardingKey(userId)) === 'done';
}

export function markOnboardingComplete(userId: string) {
  if (typeof window === 'undefined') return;
  safeLocalStorageSet(getOnboardingKey(userId), 'done');
}

const SESSION_KEY = 'niskbuild_session_key';

export async function signOut() {
  const supabase = createClient();

  if (typeof window !== 'undefined') {
    const sessionToken = safeLocalStorageGet(SESSION_KEY);
    if (sessionToken) {
      try {
        await fetch('/api/session/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionToken }),
        });
      } catch {
        // Best-effort cleanup
      }
      safeLocalStorageRemove(SESSION_KEY);
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
  }

  if (typeof window !== 'undefined') {
    const product = resolvePostAuthProduct(window.location.origin);
    window.location.href = product === 'supereduc8' ? '/' : '/landing-v2';
  }
}

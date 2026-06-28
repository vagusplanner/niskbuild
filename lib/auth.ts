import { createClient } from '@/lib/supabase/client';

function getOrigin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export async function signInWithGoogle(nextPath = '/pricing') {
  const supabase = createClient();
  const callbackUrl = `${getOrigin()}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getOrigin()}/auth/callback?next=/pricing`,
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
  return localStorage.getItem(getOnboardingKey(userId)) === 'done';
}

export function markOnboardingComplete(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getOnboardingKey(userId), 'done');
}

const SESSION_KEY = 'niskbuild_session_key';

export async function signOut() {
  const supabase = createClient();

  if (typeof window !== 'undefined') {
    const sessionToken = localStorage.getItem(SESSION_KEY);
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
      localStorage.removeItem(SESSION_KEY);
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
  }

  if (typeof window !== 'undefined') {
    window.location.href = '/landing';
  }
}

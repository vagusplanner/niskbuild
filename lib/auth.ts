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

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

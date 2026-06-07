import { supabase } from '@/lib/supabaseClient';

export async function signInWithGoogle(nextPath = '/builder') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    },
  });
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
  }
}

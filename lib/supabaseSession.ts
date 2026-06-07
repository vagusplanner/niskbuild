import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

function isRefreshTokenError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return (
    message.includes('Refresh Token') ||
    message.includes('refresh_token') ||
    message.includes('Invalid Refresh Token')
  );
}

/** Clear corrupted auth state from local storage without calling the API. */
export async function clearStaleAuth(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore — local storage may already be empty
  }
}

/**
 * Safely read the current session. Clears stale tokens instead of throwing
 * when the refresh token is missing or invalid.
 */
export async function getSafeSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error && isRefreshTokenError(error)) {
      await clearStaleAuth();
      return null;
    }

    if (error) {
      console.warn('Auth session error:', error.message);
      return null;
    }

    return data.session;
  } catch (error) {
    if (isRefreshTokenError(error)) {
      await clearStaleAuth();
    }
    return null;
  }
}

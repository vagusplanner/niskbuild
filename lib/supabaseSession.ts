import { createClient } from '@/lib/supabase/client';
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
    message.includes('Invalid Refresh Token') ||
    message.includes('PKCE')
  );
}

export async function clearStaleAuth(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore
  }
}

export async function getSafeSession(): Promise<Session | null> {
  try {
    const supabase = createClient();
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

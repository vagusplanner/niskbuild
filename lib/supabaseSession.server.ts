/**
 * Cookie-aware getSafeSession for Server Components and route handlers.
 * Client components should use getSafeSession from @/lib/supabaseSession instead.
 */
import 'server-only';

import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

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

export async function getSafeSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error && isRefreshTokenError(error)) {
      return null;
    }

    if (error) {
      console.warn('Auth session error:', error.message);
      return null;
    }

    return data.session;
  } catch (error) {
    if (isRefreshTokenError(error)) {
      return null;
    }
    return null;
  }
}

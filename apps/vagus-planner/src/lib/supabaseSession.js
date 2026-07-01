import { supabase } from './base44-compat';

function isRefreshTokenError(error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error);

  return (
    message.includes('Refresh Token') ||
    message.includes('refresh_token') ||
    message.includes('Invalid Refresh Token') ||
    message.includes('PKCE')
  );
}

export async function clearStaleAuth() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore
  }
}

/** Mirrors NiskBuild getSafeSession — client session read with stale-token cleanup. */
export async function getSafeSession() {
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

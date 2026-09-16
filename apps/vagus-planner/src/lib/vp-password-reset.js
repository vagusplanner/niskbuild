/**
 * Vagus Planner password-reset helpers.
 * Shared Supabase Auth with NiskBuild — Site URL defaults to niskbuild.com, so
 * every VP-triggered reset MUST pass an explicit redirectTo at the VP reset page.
 */

import { supabase } from '@/lib/base44-compat';
import { isNativeCapacitorApp } from '@/lib/vp-platform';

const DEFAULT_VP_PUBLIC_ORIGIN = 'https://vagusplanner.com';

/** Public web origin for email links (never capacitor://). */
export function getVpPublicOrigin() {
  const fromEnv = (
    import.meta.env.VITE_VP_PUBLIC_URL ||
    import.meta.env.VITE_APP_ORIGIN ||
    ''
  )
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const proto = window.location.protocol;
    if (proto === 'capacitor:' || proto === 'ionic:' || isNativeCapacitorApp()) {
      return DEFAULT_VP_PUBLIC_ORIGIN;
    }
    if (window.location.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
  }
  return DEFAULT_VP_PUBLIC_ORIGIN;
}

/**
 * Absolute URL Supabase should send the user to after clicking the email link.
 * Must be listed in Supabase Auth → Redirect URLs.
 *
 * Always use a PATH (not hash). Emails open in a normal browser against the live
 * VP site, which uses BrowserRouter — `/#/reset-password` is ignored and shows
 * the marketing Landing page. Capacitor still benefits: the link opens Safari
 * to the web reset form.
 */
export function getVpPasswordResetRedirectUrl() {
  const origin = getVpPublicOrigin();
  return `${origin}/reset-password`;
}

export async function requestVpPasswordReset(email) {
  const trimmed = String(email || '').trim();
  if (!trimmed) throw new Error('Email is required');

  const redirectTo = getVpPasswordResetRedirectUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo,
  });
  if (error) throw error;
  return { redirectTo };
}

export async function updateVpPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Consume recovery tokens from the URL (PKCE ?code= or legacy hash tokens).
 * Call once on the reset-password page mount.
 */
export async function consumeVpRecoverySession() {
  if (typeof window === 'undefined') return { session: null, error: null };

  const href = window.location.href;
  const search = window.location.search || '';
  const hash = window.location.hash || '';

  // PKCE: code may be on the search string before the hash, or inside the hash query.
  let code = new URLSearchParams(search).get('code');
  if (!code && hash.includes('?')) {
    const hashQuery = hash.slice(hash.indexOf('?') + 1);
    code = new URLSearchParams(hashQuery).get('code');
  }
  if (!code) {
    try {
      const u = new URL(href);
      code = u.searchParams.get('code');
    } catch {
      // ignore
    }
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { session: null, error };
    return { session: data.session ?? null, error: null };
  }

  // Legacy implicit: #access_token=...&type=recovery — supabase-js picks this up via getSession
  // after detectSessionInUrl (default true) parses the hash on client create.
  const { data, error } = await supabase.auth.getSession();
  if (error) return { session: null, error };
  return { session: data.session ?? null, error: null };
}

import 'server-only';

import {
  GOOGLE_CALENDAR_AUTH_URL,
  GOOGLE_CALENDAR_TOKEN_URL,
  GOOGLE_CALENDAR_REVOKE_URL,
  GOOGLE_USERINFO_URL,
  type GoogleTokenResponse,
} from '@/lib/google-calendar/oauth';

/** Write events + Meet (not VP readonly). */
export const NS_GOOGLE_CALENDAR_EVENTS_SCOPE =
  'https://www.googleapis.com/auth/calendar.events';

export const NS_GOOGLE_CALENDAR_SCOPES = [
  NS_GOOGLE_CALENDAR_EVENTS_SCOPE,
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export const NS_OAUTH_STATE_PROVIDER = 'ns_google_calendar' as const;

export class NsGoogleCalendarAuthError extends Error {
  code: 'not_connected' | 'revoked' | 'misconfigured' | 'exchange_failed';

  constructor(
    message: string,
    code: NsGoogleCalendarAuthError['code'] = 'exchange_failed'
  ) {
    super(message);
    this.name = 'NsGoogleCalendarAuthError';
    this.code = code;
  }
}

/**
 * Canonical NS OAuth redirect URI. Must match Google Cloud Console
 * ("North South Calendar Sync" client) character-for-character.
 *
 * Priority:
 * 1. NS_GOOGLE_CALENDAR_REDIRECT_URI
 * 2. NEXT_PUBLIC_APP_URL + /api/north-south/google-calendar/callback
 */
export function getNsGoogleCalendarRedirectUri(): string {
  const explicit = process.env.NS_GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  let base = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.niskbuild.com')
    .trim()
    .replace(/\/$/, '');

  try {
    const u = new URL(base);
    if (u.hostname.toLowerCase() === 'niskbuild.com') {
      u.hostname = 'www.niskbuild.com';
      base = u.origin;
    }
  } catch {
    /* keep base */
  }

  return `${base}/api/north-south/google-calendar/callback`;
}

export function getNsGoogleCalendarOAuthDebug(): {
  redirect_uri: string;
  client_id_present: boolean;
  client_id_suffix: string | null;
  client_secret_present: boolean;
  scope: string;
  auth_base: string;
  next_public_app_url: string | null;
  redirect_uri_source: 'NS_GOOGLE_CALENDAR_REDIRECT_URI' | 'NEXT_PUBLIC_APP_URL';
} {
  const explicit = Boolean(process.env.NS_GOOGLE_CALENDAR_REDIRECT_URI?.trim());
  const clientId = process.env.NS_GOOGLE_CALENDAR_CLIENT_ID?.trim() || '';
  return {
    redirect_uri: getNsGoogleCalendarRedirectUri(),
    client_id_present: Boolean(clientId),
    client_id_suffix: clientId ? clientId.slice(-6) : null,
    client_secret_present: Boolean(
      process.env.NS_GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
    ),
    scope: NS_GOOGLE_CALENDAR_SCOPES,
    auth_base: GOOGLE_CALENDAR_AUTH_URL,
    next_public_app_url: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
    redirect_uri_source: explicit
      ? 'NS_GOOGLE_CALENDAR_REDIRECT_URI'
      : 'NEXT_PUBLIC_APP_URL',
  };
}

export function getNsGoogleCalendarClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.NS_GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.NS_GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new NsGoogleCalendarAuthError(
      'NS_GOOGLE_CALENDAR_CLIENT_ID and NS_GOOGLE_CALENDAR_CLIENT_SECRET are not configured',
      'misconfigured'
    );
  }
  return { clientId, clientSecret };
}

export function isNsGoogleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.NS_GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.NS_GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  );
}

export function buildNsGoogleCalendarAuthorizeUrl(state: string): string {
  if (!state || !String(state).trim()) {
    throw new NsGoogleCalendarAuthError('OAuth state is empty', 'misconfigured');
  }
  const { clientId } = getNsGoogleCalendarClientCredentials();
  const redirectUri = getNsGoogleCalendarRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: NS_GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: String(state).trim(),
  });
  return `${GOOGLE_CALENDAR_AUTH_URL}?${params.toString()}`;
}

export function redactNsAuthorizeUrl(authorizeUrl: string): string {
  try {
    const u = new URL(authorizeUrl);
    const cid = u.searchParams.get('client_id') || '';
    if (cid.length > 6) {
      u.searchParams.set('client_id', `…${cid.slice(-6)}`);
    }
    return u.toString();
  } catch {
    return '[invalid authorize url]';
  }
}

export async function exchangeNsGoogleCalendarCode(
  code: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getNsGoogleCalendarClientCredentials();
  const redirectUri = getNsGoogleCalendarRedirectUri();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    grant_type: 'authorization_code',
  });

  const res = await fetch(GOOGLE_CALENDAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    console.error('[ns-google-calendar] token exchange rejected by Google', {
      status: res.status,
      error: data.error ?? null,
      error_description: data.error_description ?? null,
      redirect_uri: redirectUri,
      client_id_suffix: clientId.slice(-6),
      client_secret_present: Boolean(clientSecret),
    });
    throw new NsGoogleCalendarAuthError(
      data.error_description || data.error || 'Google token exchange failed',
      'exchange_failed'
    );
  }

  return data;
}

export async function refreshNsGoogleCalendarAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getNsGoogleCalendarClientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GOOGLE_CALENDAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    const msg = data.error_description || data.error || 'Google token refresh failed';
    const revoked =
      data.error === 'invalid_grant' || /revoked|expired|invalid/i.test(msg);
    throw new NsGoogleCalendarAuthError(msg, revoked ? 'revoked' : 'exchange_failed');
  }

  return data;
}

export async function revokeNsGoogleCalendarToken(token: string): Promise<void> {
  try {
    await fetch(`${GOOGLE_CALENDAR_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // Best-effort
  }
}

export async function fetchNsGoogleAccountEmail(
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return typeof data.email === 'string' ? data.email : null;
  } catch {
    return null;
  }
}

/** Where to send the coach after NS Calendar OAuth. */
export function resolveNsGoogleCalendarReturnUrl(
  returnTo: string | null | undefined,
  query: Record<string, string>
): string {
  const nsBase = (
    process.env.NEXT_PUBLIC_NORTH_SOUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:5173'
  ).replace(/\/$/, '');

  let target = `${nsBase}/my-bookings`;
  if (returnTo) {
    try {
      const u = new URL(returnTo);
      const allowedHosts = new Set<string>();
      for (const key of [
        'NEXT_PUBLIC_NORTH_SOUTH_URL',
        'NEXT_PUBLIC_APP_URL',
      ] as const) {
        const raw = process.env[key]?.trim();
        if (!raw) continue;
        try {
          allowedHosts.add(new URL(raw).hostname.toLowerCase());
        } catch {
          /* ignore */
        }
      }
      allowedHosts.add('localhost');
      allowedHosts.add('127.0.0.1');
      if (allowedHosts.has(u.hostname.toLowerCase())) {
        target = u.toString().split('?')[0];
      }
    } catch {
      /* keep default */
    }
  }

  const dest = new URL(target);
  for (const [k, v] of Object.entries(query)) {
    dest.searchParams.set(k, v);
  }
  return dest.toString();
}

export type { GoogleTokenResponse };

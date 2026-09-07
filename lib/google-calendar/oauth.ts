import 'server-only';

import { appUrl } from '@/lib/email/app-url';

export const GOOGLE_CALENDAR_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_CALENDAR_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_CALENDAR_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/** v1: read-only primary calendar pull */
export const GOOGLE_CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly';

export const GOOGLE_CALENDAR_SCOPES = [
  GOOGLE_CALENDAR_READONLY_SCOPE,
  'openid',
  'email',
  'profile',
].join(' ');

export class GoogleCalendarAuthError extends Error {
  code: 'not_connected' | 'revoked' | 'misconfigured' | 'exchange_failed';

  constructor(
    message: string,
    code: GoogleCalendarAuthError['code'] = 'exchange_failed'
  ) {
    super(message);
    this.name = 'GoogleCalendarAuthError';
    this.code = code;
  }
}

export function getGoogleCalendarRedirectUri(): string {
  return `${appUrl()}/api/vagus-planner/google-calendar/callback`;
}

export function getGoogleCalendarClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new GoogleCalendarAuthError(
      'GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET are not configured',
      'misconfigured'
    );
  }
  return { clientId, clientSecret };
}

export function isGoogleCalendarOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  );
}

export function buildGoogleCalendarAuthorizeUrl(state: string): string {
  const { clientId } = getGoogleCalendarClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCalendarRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_CALENDAR_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeGoogleCalendarCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleCalendarClientCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getGoogleCalendarRedirectUri(),
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
    throw new GoogleCalendarAuthError(
      data.error_description || data.error || 'Google token exchange failed',
      'exchange_failed'
    );
  }

  return data;
}

export async function refreshGoogleCalendarAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getGoogleCalendarClientCredentials();
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
      data.error === 'invalid_grant' ||
      /revoked|expired|invalid/i.test(msg);
    throw new GoogleCalendarAuthError(msg, revoked ? 'revoked' : 'exchange_failed');
  }

  return data;
}

export async function revokeGoogleCalendarToken(token: string): Promise<void> {
  try {
    await fetch(`${GOOGLE_CALENDAR_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // Best-effort revoke — local clear still proceeds
  }
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
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

/** Where to send the user after OAuth (VP SPA Account page by default). */
export function resolveGoogleCalendarReturnUrl(
  returnTo: string | null | undefined,
  query: Record<string, string>
): string {
  const vpBase = (
    process.env.NEXT_PUBLIC_VAGUS_PLANNER_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:5175'
  ).replace(/\/$/, '');

  let target = `${vpBase}/Account`;
  if (returnTo) {
    try {
      const u = new URL(returnTo);
      const allowedHosts = new Set<string>();
      for (const key of [
        'NEXT_PUBLIC_VAGUS_PLANNER_URL',
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

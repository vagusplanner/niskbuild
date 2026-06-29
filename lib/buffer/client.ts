import 'server-only';

import { appUrl } from '@/lib/email/app-url';

const BUFFER_AUTH_URL = 'https://buffer.com/oauth2/authorize';
const BUFFER_TOKEN_URL = 'https://api.bufferapp.com/1/oauth2/token.json';
export const BUFFER_API_BASE = 'https://api.bufferapp.com/1';

/** Buffer access token invalid — user must reconnect OAuth */
export class BufferAuthExpiredError extends Error {
  constructor(message = 'Buffer connection expired') {
    super(message);
    this.name = 'BufferAuthExpiredError';
  }
}

export function getBufferRedirectUri(): string {
  return `${appUrl()}/api/social/buffer/callback`;
}

export function buildBufferAuthorizeUrl(state: string): string {
  const clientId = process.env.BUFFER_CLIENT_ID;
  if (!clientId) {
    throw new Error('BUFFER_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getBufferRedirectUri(),
    response_type: 'code',
    state,
  });

  return `${BUFFER_AUTH_URL}?${params.toString()}`;
}

export type BufferTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type BufferTokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  buffer_profile_id: string | null;
};

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export async function exchangeBufferCode(code: string): Promise<BufferTokenResponse> {
  const clientId = process.env.BUFFER_CLIENT_ID;
  const clientSecret = process.env.BUFFER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('BUFFER_CLIENT_ID and BUFFER_CLIENT_SECRET are required');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getBufferRedirectUri(),
    code,
    grant_type: 'authorization_code',
  });

  const res = await fetch(BUFFER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as BufferTokenResponse & { error?: string; message?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || data.message || 'Buffer token exchange failed');
  }

  return data;
}

export async function refreshBufferAccessToken(
  refreshToken: string
): Promise<BufferTokenResponse> {
  const clientId = process.env.BUFFER_CLIENT_ID;
  const clientSecret = process.env.BUFFER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('BUFFER_CLIENT_ID and BUFFER_CLIENT_SECRET are required');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(BUFFER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as BufferTokenResponse & { error?: string; message?: string };
  if (!res.ok || !data.access_token) {
    throw new BufferAuthExpiredError(data.error || data.message || 'Buffer refresh failed');
  }

  return data;
}

export async function fetchBufferProfile(accessToken: string): Promise<{ id: string } | null> {
  const res = await fetch(
    `${BUFFER_API_BASE}/user.json?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

export async function upsertBufferToken(
  userId: string,
  tokens: BufferTokenResponse,
  bufferProfileId?: string | null
): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const expiresAt =
    tokens.expires_in != null
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

  const { data: existing } = await admin
    .schema('firstparty')
    .from('buffer_tokens')
    .select('buffer_profile_id, refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  const { error } = await admin.schema('firstparty').from('buffer_tokens').upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      expires_at: expiresAt,
      buffer_profile_id: bufferProfileId ?? existing?.buffer_profile_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save Buffer token: ${error.message}`);
  }
}

export async function loadBufferTokenRow(userId: string): Promise<BufferTokenRow | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();

  const { data } = await admin
    .schema('firstparty')
    .from('buffer_tokens')
    .select('user_id, access_token, refresh_token, expires_at, buffer_profile_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.access_token) return null;
  return data as BufferTokenRow;
}

function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < EXPIRY_BUFFER_MS;
}

/** Returns a valid access token, refreshing when needed. */
export async function getValidBufferAccessToken(userId: string): Promise<string> {
  const row = await loadBufferTokenRow(userId);
  if (!row) {
    throw new BufferAuthExpiredError('Buffer is not connected');
  }

  const expired = row.expires_at && new Date(row.expires_at).getTime() < Date.now();
  const needsRefresh = expired || isTokenExpiringSoon(row.expires_at);

  if (!needsRefresh) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new BufferAuthExpiredError('Buffer token expired — reconnect required');
  }

  const refreshed = await refreshBufferAccessToken(row.refresh_token);
  await upsertBufferToken(userId, refreshed, row.buffer_profile_id);
  return refreshed.access_token;
}

/** Lightweight connected check (no refresh attempt). */
export async function getBufferTokenForUser(userId: string): Promise<string | null> {
  try {
    const row = await loadBufferTokenRow(userId);
    if (!row?.access_token) return null;
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return row.refresh_token ? '__needs_refresh__' : null;
    }
    return row.access_token;
  } catch {
    return null;
  }
}

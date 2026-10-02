import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  NsGoogleCalendarAuthError,
  refreshNsGoogleCalendarAccessToken,
  revokeNsGoogleCalendarToken,
  type GoogleTokenResponse,
} from './oauth';

export type NsGoogleCalendarConnectionRow = {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_email: string | null;
  created_at?: string;
  updated_at?: string;
};

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const TABLE = 'ns_google_calendar_connections';

function adminFp() {
  return createAdminClient().schema('firstparty');
}

export async function loadNsGoogleCalendarConnection(
  userId: string
): Promise<NsGoogleCalendarConnectionRow | null> {
  const { data } = await adminFp()
    .from(TABLE)
    .select('user_id, access_token, refresh_token, token_expiry, calendar_email, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.access_token && !data?.refresh_token) return null;
  return data as NsGoogleCalendarConnectionRow;
}

/** Single-coach: first connection row with tokens (any staff who connected). */
export async function loadPrimaryNsGoogleCalendarConnection(): Promise<NsGoogleCalendarConnectionRow | null> {
  const { data } = await adminFp()
    .from(TABLE)
    .select('user_id, access_token, refresh_token, token_expiry, calendar_email, created_at, updated_at')
    .not('refresh_token', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.refresh_token || data?.access_token) {
    return data as NsGoogleCalendarConnectionRow;
  }

  const { data: fallback } = await adminFp()
    .from(TABLE)
    .select('user_id, access_token, refresh_token, token_expiry, calendar_email, created_at, updated_at')
    .not('access_token', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!fallback?.access_token && !fallback?.refresh_token) return null;
  return fallback as NsGoogleCalendarConnectionRow;
}

export async function isNsGoogleCalendarConnected(userId: string): Promise<boolean> {
  const row = await loadNsGoogleCalendarConnection(userId);
  return Boolean(row && (row.access_token || row.refresh_token));
}

export async function upsertNsGoogleCalendarConnection(
  userId: string,
  tokens: GoogleTokenResponse,
  extras?: { calendar_email?: string | null }
): Promise<void> {
  const existing = await loadNsGoogleCalendarConnection(userId);
  const tokenExpiry =
    tokens.expires_in != null
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : existing?.token_expiry ?? null;

  const { error } = await adminFp().from(TABLE).upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      token_expiry: tokenExpiry,
      calendar_email:
        extras?.calendar_email ?? existing?.calendar_email ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save NS Google Calendar connection: ${error.message}`);
  }
}

export async function clearNsGoogleCalendarConnection(
  userId: string,
  options?: { revokeAtGoogle?: boolean }
): Promise<void> {
  const existing = await loadNsGoogleCalendarConnection(userId);
  if (!existing) return;

  if (options?.revokeAtGoogle !== false) {
    const token = existing.refresh_token || existing.access_token;
    if (token) await revokeNsGoogleCalendarToken(token);
  }

  await adminFp().from(TABLE).delete().eq('user_id', userId);
}

function isTokenExpiringSoon(tokenExpiry: string | null): boolean {
  if (!tokenExpiry) return false;
  return new Date(tokenExpiry).getTime() - Date.now() < EXPIRY_BUFFER_MS;
}

export async function getValidNsGoogleCalendarAccessToken(
  userId: string
): Promise<string> {
  const row = await loadNsGoogleCalendarConnection(userId);
  if (!row || (!row.access_token && !row.refresh_token)) {
    throw new NsGoogleCalendarAuthError(
      'North South Google Calendar is not connected',
      'not_connected'
    );
  }

  const expired =
    row.token_expiry && new Date(row.token_expiry).getTime() < Date.now();
  const needsRefresh =
    !row.access_token || expired || isTokenExpiringSoon(row.token_expiry);

  if (!needsRefresh && row.access_token) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    await clearNsGoogleCalendarConnection(userId, { revokeAtGoogle: false });
    throw new NsGoogleCalendarAuthError(
      'North South Google Calendar connection expired — reconnect required',
      'revoked'
    );
  }

  try {
    const refreshed = await refreshNsGoogleCalendarAccessToken(row.refresh_token);
    await upsertNsGoogleCalendarConnection(userId, refreshed);
    return refreshed.access_token;
  } catch (err) {
    if (err instanceof NsGoogleCalendarAuthError && err.code === 'revoked') {
      await clearNsGoogleCalendarConnection(userId, { revokeAtGoogle: false });
    }
    throw err;
  }
}

/** Prefer the given userId connection; else primary (single-coach) connection. */
export async function getValidNsCoachCalendarAccessToken(
  preferredUserId?: string | null
): Promise<{ accessToken: string; coachUserId: string }> {
  if (preferredUserId) {
    try {
      const accessToken = await getValidNsGoogleCalendarAccessToken(preferredUserId);
      return { accessToken, coachUserId: preferredUserId };
    } catch (err) {
      if (
        !(err instanceof NsGoogleCalendarAuthError) ||
        err.code !== 'not_connected'
      ) {
        throw err;
      }
    }
  }

  const primary = await loadPrimaryNsGoogleCalendarConnection();
  if (!primary?.user_id) {
    throw new NsGoogleCalendarAuthError(
      'No North South coach Google Calendar is connected',
      'not_connected'
    );
  }
  const accessToken = await getValidNsGoogleCalendarAccessToken(primary.user_id);
  return { accessToken, coachUserId: primary.user_id };
}

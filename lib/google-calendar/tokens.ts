import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  GoogleCalendarAuthError,
  type GoogleTokenResponse,
  refreshGoogleCalendarAccessToken,
  revokeGoogleCalendarToken,
} from './oauth';

export type GoogleCalendarConnectionRow = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string | null;
  google_account_email: string | null;
  calendar_id: string;
  status: 'active' | 'revoked' | 'error';
  revoked_at: string | null;
  last_error: string | null;
};

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const TABLE = 'vp_google_calendar_connections';

function adminFp() {
  return createAdminClient().schema('firstparty');
}

export async function loadGoogleCalendarConnection(
  userId: string
): Promise<GoogleCalendarConnectionRow | null> {
  const { data } = await adminFp()
    .from(TABLE)
    .select(
      'id, user_id, access_token, refresh_token, expires_at, scopes, google_account_email, calendar_id, status, revoked_at, last_error'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (!data?.access_token) return null;
  return data as GoogleCalendarConnectionRow;
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const row = await loadGoogleCalendarConnection(userId);
  return Boolean(row && row.status === 'active' && row.access_token);
}

export async function upsertGoogleCalendarConnection(
  userId: string,
  tokens: GoogleTokenResponse,
  extras?: {
    google_account_email?: string | null;
    calendar_id?: string;
  }
): Promise<void> {
  const existing = await loadGoogleCalendarConnection(userId);
  const expiresAt =
    tokens.expires_in != null
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : existing?.expires_at ?? null;

  const { error } = await adminFp().from(TABLE).upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      expires_at: expiresAt,
      scopes: tokens.scope ?? existing?.scopes ?? null,
      google_account_email:
        extras?.google_account_email ?? existing?.google_account_email ?? null,
      calendar_id: extras?.calendar_id ?? existing?.calendar_id ?? 'primary',
      status: 'active',
      revoked_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save Google Calendar connection: ${error.message}`);
  }
}

/** Mark disconnected, clear secrets, optionally revoke at Google. */
export async function clearGoogleCalendarConnection(
  userId: string,
  options?: { revokeAtGoogle?: boolean; error?: string | null }
): Promise<void> {
  const existing = await loadGoogleCalendarConnection(userId);
  if (!existing) return;

  if (options?.revokeAtGoogle !== false) {
    const token = existing.refresh_token || existing.access_token;
    if (token) await revokeGoogleCalendarToken(token);
  }

  await adminFp()
    .from(TABLE)
    .update({
      access_token: '',
      refresh_token: null,
      expires_at: null,
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      last_error: options?.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < EXPIRY_BUFFER_MS;
}

/**
 * Returns a valid access token, refreshing when needed.
 * On invalid_grant / revoked refresh → clears connection and throws.
 */
export async function getValidGoogleCalendarAccessToken(userId: string): Promise<string> {
  const row = await loadGoogleCalendarConnection(userId);
  if (!row || row.status !== 'active' || !row.access_token) {
    throw new GoogleCalendarAuthError('Google Calendar is not connected', 'not_connected');
  }

  const expired = row.expires_at && new Date(row.expires_at).getTime() < Date.now();
  const needsRefresh = expired || isTokenExpiringSoon(row.expires_at);

  if (!needsRefresh) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    await clearGoogleCalendarConnection(userId, {
      revokeAtGoogle: false,
      error: 'Access token expired and no refresh token is available',
    });
    await markUserSettingsDisconnected(userId);
    throw new GoogleCalendarAuthError(
      'Google Calendar connection expired — reconnect required',
      'revoked'
    );
  }

  try {
    const refreshed = await refreshGoogleCalendarAccessToken(row.refresh_token);
    await upsertGoogleCalendarConnection(userId, refreshed);
    return refreshed.access_token;
  } catch (err) {
    if (err instanceof GoogleCalendarAuthError && err.code === 'revoked') {
      await clearGoogleCalendarConnection(userId, {
        revokeAtGoogle: false,
        error: err.message,
      });
      await markUserSettingsDisconnected(userId);
    }
    throw err;
  }
}

/** Soft-disconnect flags in UserSettings preferences (no crash if missing). */
export async function markUserSettingsConnected(
  userId: string,
  extras?: { lastSyncAt?: string; email?: string | null }
): Promise<void> {
  await patchUserSettingsGoogleFlags(userId, {
    google_calendar_connected: true,
    google_calendar_sync_enabled: true,
    google_calendar_last_sync: extras?.lastSyncAt ?? null,
    google_calendar_email: extras?.email ?? null,
  });
}

export async function markUserSettingsDisconnected(userId: string): Promise<void> {
  await patchUserSettingsGoogleFlags(userId, {
    google_calendar_connected: false,
    google_calendar_sync_enabled: false,
  });
}

async function patchUserSettingsGoogleFlags(
  userId: string,
  flags: Record<string, unknown>
): Promise<void> {
  try {
    const { data: rows } = await adminFp()
      .from('vp_user_settings')
      .select('id, preferences')
      .eq('user_id', userId)
      .limit(1);

    const existing = rows?.[0] as { id: string; preferences?: Record<string, unknown> } | undefined;
    const prefs = {
      ...(existing?.preferences && typeof existing.preferences === 'object'
        ? existing.preferences
        : {}),
      ...flags,
    };

    if (existing?.id) {
      await adminFp()
        .from('vp_user_settings')
        .update({ preferences: prefs, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await adminFp().from('vp_user_settings').insert({
        user_id: userId,
        preferences: prefs,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[google-calendar] Failed to patch user settings flags:', err);
  }
}

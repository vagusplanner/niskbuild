import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { GoogleCalendarAuthError } from './oauth';
import {
  clearGoogleCalendarConnection,
  getValidGoogleCalendarAccessToken,
  loadGoogleCalendarConnection,
  markUserSettingsConnected,
  markUserSettingsDisconnected,
} from './tokens';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SYNC_SERVICE = 'googlecalendar';
const PAST_DAYS = 30;
const FUTURE_DAYS = 90;

export type GooglePullMode = 'full' | 'incremental';

export type GooglePullResult = {
  mode: GooglePullMode;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  total: number;
  /** Aliases for older UI call sites */
  syncedCount: number;
  imported: number;
  exported: number;
  syncTokenPresent: boolean;
};

type GoogleEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleEventDate;
  end?: GoogleEventDate;
  htmlLink?: string;
  updated?: string;
  recurringEventId?: string;
};

type GoogleEventsListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
  error?: { code?: number; message?: string; status?: string };
};

function adminFp() {
  return createAdminClient().schema('firstparty');
}

function externalIdFor(calendarId: string, googleEventId: string): string {
  return `gcal:${calendarId}:${googleEventId}`;
}

function parseGoogleStartEnd(ev: GoogleCalendarEvent): {
  start: string | null;
  end: string | null;
  isAllDay: boolean;
} {
  const startRaw = ev.start?.dateTime || ev.start?.date || null;
  const endRaw = ev.end?.dateTime || ev.end?.date || null;
  const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);

  let start: string | null = null;
  let end: string | null = null;

  if (startRaw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startRaw)) {
      start = `${startRaw}T00:00:00.000Z`;
    } else {
      const d = new Date(startRaw);
      start = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  if (endRaw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
      // Google all-day end is exclusive; store as end-of-previous-day for display
      const d = new Date(`${endRaw}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      d.setUTCHours(23, 59, 59, 999);
      end = d.toISOString();
    } else {
      const d = new Date(endRaw);
      end = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
  }

  return { start, end: end ?? start, isAllDay };
}

async function upsertSyncState(
  userId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { data: existing } = await adminFp()
    .from('vp_sync_states')
    .select('id')
    .eq('user_id', userId)
    .eq('service', SYNC_SERVICE)
    .maybeSingle();

  const row = {
    user_id: userId,
    service: SYNC_SERVICE,
    updated_at: new Date().toISOString(),
    ...patch,
  };

  if (existing?.id) {
    await adminFp().from('vp_sync_states').update(row).eq('id', existing.id);
  } else {
    await adminFp().from('vp_sync_states').insert(row);
  }
}

async function loadSyncToken(userId: string): Promise<string | null> {
  const { data } = await adminFp()
    .from('vp_sync_states')
    .select('sync_token')
    .eq('user_id', userId)
    .eq('service', SYNC_SERVICE)
    .maybeSingle();
  return typeof data?.sync_token === 'string' && data.sync_token
    ? data.sync_token
    : null;
}

async function fetchGoogleEventsPage(
  accessToken: string,
  url: string
): Promise<GoogleEventsListResponse> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as GoogleEventsListResponse;

  if (!res.ok) {
    const msg = data.error?.message || `Google Calendar API error (${res.status})`;
    const err = new Error(msg) as Error & { status?: number; googleStatus?: string };
    err.status = res.status;
    err.googleStatus = data.error?.status;
    throw err;
  }

  return data;
}

async function listGoogleEvents(params: {
  accessToken: string;
  calendarId: string;
  mode: GooglePullMode;
  syncToken: string | null;
}): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken: string | null }> {
  const { accessToken, calendarId, mode, syncToken } = params;
  const encodedCal = encodeURIComponent(calendarId);
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  const useIncremental = mode === 'incremental' && Boolean(syncToken);

  do {
    const qs = new URLSearchParams({
      singleEvents: 'true',
      maxResults: '250',
      showDeleted: useIncremental ? 'true' : 'false',
    });

    if (useIncremental && syncToken) {
      qs.set('syncToken', syncToken);
    } else {
      const timeMin = new Date();
      timeMin.setUTCDate(timeMin.getUTCDate() - PAST_DAYS);
      const timeMax = new Date();
      timeMax.setUTCDate(timeMax.getUTCDate() + FUTURE_DAYS);
      qs.set('timeMin', timeMin.toISOString());
      qs.set('timeMax', timeMax.toISOString());
      qs.set('orderBy', 'startTime');
    }

    if (pageToken) qs.set('pageToken', pageToken);

    const url = `${CALENDAR_API}/calendars/${encodedCal}/events?${qs.toString()}`;

    try {
      const page = await fetchGoogleEventsPage(accessToken, url);
      if (page.items?.length) events.push(...page.items);
      pageToken = page.nextPageToken;
      if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
    } catch (err) {
      const status = (err as { status?: number }).status;
      const googleStatus = (err as { googleStatus?: string }).googleStatus;
      // 410 Gone = sync token invalid → caller should retry full
      if (status === 410 || googleStatus === 'GONE') {
        const gone = new Error('SYNC_TOKEN_EXPIRED') as Error & { code: string };
        gone.code = 'SYNC_TOKEN_EXPIRED';
        throw gone;
      }
      throw err;
    }
  } while (pageToken);

  return { events, nextSyncToken };
}

async function upsertImportedEvent(
  userId: string,
  calendarId: string,
  ev: GoogleCalendarEvent
): Promise<'created' | 'updated' | 'deleted' | 'skipped'> {
  if (!ev.id) return 'skipped';

  const extId = externalIdFor(calendarId, ev.id);

  if (ev.status === 'cancelled') {
    const { data: existing } = await adminFp()
      .from('vp_events')
      .select('id')
      .eq('user_id', userId)
      .eq('external_id', extId)
      .maybeSingle();
    if (existing?.id) {
      await adminFp().from('vp_events').delete().eq('id', existing.id);
      return 'deleted';
    }
    return 'skipped';
  }

  const { start, end, isAllDay } = parseGoogleStartEnd(ev);
  if (!start) return 'skipped';

  const title = (ev.summary || '(Untitled event)').trim().slice(0, 500);
  const row = {
    user_id: userId,
    title,
    description: ev.description ?? null,
    location: ev.location ?? null,
    event_date: start,
    end_date: end,
    source: 'google_calendar',
    external_id: extId,
    external_calendar_type: 'google',
    is_all_day: isAllDay,
    metadata: {
      google_event_id: ev.id,
      google_calendar_id: calendarId,
      html_link: ev.htmlLink ?? null,
      recurring_event_id: ev.recurringEventId ?? null,
      google_updated: ev.updated ?? null,
    },
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await adminFp()
    .from('vp_events')
    .select('id')
    .eq('user_id', userId)
    .eq('external_id', extId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await adminFp().from('vp_events').update(row).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return 'updated';
  }

  const { error } = await adminFp().from('vp_events').insert(row);
  if (error) throw new Error(error.message);
  return 'created';
}

/**
 * One-way Google → VP pull. Supports full window and incremental syncToken modes.
 * Never throws for missing connection in a way that crashes callers — returns typed errors.
 */
export async function pullGoogleCalendarForUser(
  userId: string,
  options?: {
    mode?: GooglePullMode;
    calendarId?: string;
  }
): Promise<GooglePullResult> {
  let mode: GooglePullMode = options?.mode === 'full' ? 'full' : 'incremental';
  const connection = await loadGoogleCalendarConnection(userId);
  const calendarId =
    options?.calendarId || connection?.calendar_id || 'primary';

  await upsertSyncState(userId, {
    status: 'syncing',
    last_attempted_at: new Date().toISOString(),
    last_error: null,
  });

  let accessToken: string;
  try {
    accessToken = await getValidGoogleCalendarAccessToken(userId);
  } catch (err) {
    const message =
      err instanceof GoogleCalendarAuthError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Not connected';
    await upsertSyncState(userId, {
      status: 'error',
      last_attempted_at: new Date().toISOString(),
      last_error: message,
    });
    if (err instanceof GoogleCalendarAuthError && err.code === 'revoked') {
      await markUserSettingsDisconnected(userId);
    }
    throw err;
  }

  let syncToken = mode === 'incremental' ? await loadSyncToken(userId) : null;
  if (mode === 'incremental' && !syncToken) {
    mode = 'full';
  }

  let listed: { events: GoogleCalendarEvent[]; nextSyncToken: string | null };
  try {
    listed = await listGoogleEvents({
      accessToken,
      calendarId,
      mode,
      syncToken,
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    const status = (err as { status?: number }).status;

    if (code === 'SYNC_TOKEN_EXPIRED') {
      await upsertSyncState(userId, { sync_token: null });
      listed = await listGoogleEvents({
        accessToken,
        calendarId,
        mode: 'full',
        syncToken: null,
      });
      mode = 'full';
    } else if (status === 401) {
      await clearGoogleCalendarConnection(userId, {
        revokeAtGoogle: false,
        error: 'Google rejected the access token (401)',
      });
      await markUserSettingsDisconnected(userId);
      await upsertSyncState(userId, {
        status: 'error',
        last_error: 'Google Calendar authorization revoked — reconnect required',
        last_attempted_at: new Date().toISOString(),
      });
      throw new GoogleCalendarAuthError(
        'Google Calendar authorization revoked — reconnect required',
        'revoked'
      );
    } else {
      const message = err instanceof Error ? err.message : 'Pull failed';
      await upsertSyncState(userId, {
        status: 'error',
        last_error: message,
        last_attempted_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  for (const ev of listed.events) {
    try {
      const result = await upsertImportedEvent(userId, calendarId, ev);
      if (result === 'created') created += 1;
      else if (result === 'updated') updated += 1;
      else if (result === 'deleted') deleted += 1;
      else skipped += 1;
    } catch (rowErr) {
      console.error('[google-calendar] event upsert failed:', rowErr);
      skipped += 1;
    }
  }

  const now = new Date().toISOString();
  await upsertSyncState(userId, {
    status: 'ok',
    last_synced_at: now,
    last_attempted_at: now,
    last_error: null,
    ...(listed.nextSyncToken ? { sync_token: listed.nextSyncToken } : {}),
  });

  await markUserSettingsConnected(userId, {
    lastSyncAt: now,
    email: connection?.google_account_email,
  });

  const imported = created + updated;
  const total = listed.events.length;

  return {
    mode,
    created,
    updated,
    deleted,
    skipped,
    total,
    syncedCount: imported,
    imported,
    exported: 0,
    syncTokenPresent: Boolean(listed.nextSyncToken || syncToken),
  };
}

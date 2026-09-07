import type { VpFunctionHandler } from '../types';
import { GoogleCalendarAuthError } from '@/lib/google-calendar/oauth';
import { pullGoogleCalendarForUser, type GooglePullMode } from '@/lib/google-calendar/sync';

function resolveMode(
  payload: Record<string, unknown>,
  defaultMode: GooglePullMode
): GooglePullMode {
  const raw = payload.mode;
  if (raw === 'full' || raw === 'incremental') return raw;
  return defaultMode;
}

async function runPull(
  userId: string,
  payload: Record<string, unknown>,
  defaultMode: GooglePullMode
) {
  const calendarId =
    typeof payload.calendarId === 'string' && payload.calendarId.trim()
      ? payload.calendarId.trim()
      : undefined;

  try {
    const data = await pullGoogleCalendarForUser(userId, {
      mode: resolveMode(payload, defaultMode),
      calendarId,
    });
    return { ok: true as const, data };
  } catch (err) {
    if (err instanceof GoogleCalendarAuthError) {
      const status = err.code === 'not_connected' || err.code === 'revoked' ? 401 : 400;
      return { ok: false as const, error: err.message, status };
    }
    const message = err instanceof Error ? err.message : 'Google Calendar sync failed';
    return { ok: false as const, error: message, status: 500 };
  }
}

/** Incremental pull (falls back to full when no syncToken). */
export const syncGoogleCalendar: VpFunctionHandler = async ({ user, payload }) =>
  runPull(user.id, payload, 'incremental');

/** Full window pull (past 30d + next 90d). */
export const initialGCalSync: VpFunctionHandler = async ({ user, payload }) =>
  runPull(user.id, payload, 'full');

/**
 * Legacy Hub / Calendar "full sync" — v1 is pull-only.
 * Returns imported counts; exported is always 0 until two-way exists.
 */
export const fullCalendarSync: VpFunctionHandler = async ({ user, payload }) =>
  runPull(user.id, { ...payload, mode: 'full' }, 'full');

import 'server-only';

import { getValidNsCoachCalendarAccessToken } from './tokens';
import { NsGoogleCalendarAuthError } from './oauth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export type NsBookingForCalendar = {
  id: string;
  client_name?: string | null;
  client_email?: string | null;
  session_type?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  timezone?: string | null;
  message?: string | null;
  service_tier?: string | null;
};

export type NsCreatedCalendarEvent = {
  calendar_event_id: string;
  meet_link: string | null;
  html_link: string | null;
  hangout_link: string | null;
  conference_data: unknown;
  raw: Record<string, unknown>;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Build RFC3339 local datetime from preferred date/time (freeform coach-confirm). */
export function buildNsEventDateTimes(booking: NsBookingForCalendar): {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
} {
  const tz =
    (booking.timezone && booking.timezone.trim()) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';

  const date =
    booking.preferred_date && /^\d{4}-\d{2}-\d{2}$/.test(booking.preferred_date)
      ? booking.preferred_date
      : new Date().toISOString().slice(0, 10);

  let hours = 10;
  let minutes = 0;
  const time = booking.preferred_time?.trim() || '';
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    hours = Math.min(23, Math.max(0, Number(m[1])));
    minutes = Math.min(59, Math.max(0, Number(m[2])));
  }

  const startLocal = `${date}T${pad2(hours)}:${pad2(minutes)}:00`;
  const endHours = hours + 1;
  const endDate = endHours >= 24
    ? (() => {
        const d = new Date(`${date}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : date;
  const endLocal = `${endDate}T${pad2(endHours % 24)}:${pad2(minutes)}:00`;

  return {
    start: { dateTime: startLocal, timeZone: tz },
    end: { dateTime: endLocal, timeZone: tz },
  };
}

function extractMeetLink(event: Record<string, unknown>): string | null {
  if (typeof event.hangoutLink === 'string' && event.hangoutLink) {
    return event.hangoutLink;
  }
  const conf = event.conferenceData as
    | {
        entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
      }
    | undefined;
  const video = conf?.entryPoints?.find((e) => e.entryPointType === 'video');
  if (video?.uri) return video.uri;
  return null;
}

/**
 * Create a Google Calendar event with Meet + client as attendee (sendUpdates=all).
 */
export async function createNsBookingCalendarEvent(
  booking: NsBookingForCalendar,
  options?: { coachUserId?: string | null }
): Promise<NsCreatedCalendarEvent> {
  const { accessToken } = await getValidNsCoachCalendarAccessToken(
    options?.coachUserId
  );

  const clientEmail = booking.client_email?.trim().toLowerCase();
  if (!clientEmail) {
    throw new NsGoogleCalendarAuthError(
      'Booking has no client_email for Meet invite',
      'misconfigured'
    );
  }

  const { start, end } = buildNsEventDateTimes(booking);
  const summary = booking.session_type
    ? `North South: ${booking.session_type}`
    : 'North South Coaching Session';

  const descriptionParts = [
    booking.client_name ? `Client: ${booking.client_name}` : null,
    booking.service_tier ? `Tier: ${booking.service_tier}` : null,
    booking.message ? `Goals: ${booking.message}` : null,
    `Booking ID: ${booking.id}`,
  ].filter(Boolean);

  const body = {
    summary,
    description: descriptionParts.join('\n'),
    start,
    end,
    attendees: [
      {
        email: clientEmail,
        displayName: booking.client_name || undefined,
      },
    ],
    conferenceData: {
      createRequest: {
        requestId: `ns-booking-${booking.id}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const url = new URL(`${CALENDAR_API}/calendars/primary/events`);
  url.searchParams.set('conferenceDataVersion', '1');
  url.searchParams.set('sendUpdates', 'all');

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };

  if (!res.ok || !data.id) {
    const msg =
      data.error?.message ||
      (typeof data.error === 'string' ? data.error : null) ||
      `Google Calendar create failed (${res.status})`;
    throw new Error(msg);
  }

  const meet_link = extractMeetLink(data);

  return {
    calendar_event_id: String(data.id),
    meet_link,
    html_link: typeof data.htmlLink === 'string' ? data.htmlLink : null,
    hangout_link: typeof data.hangoutLink === 'string' ? data.hangoutLink : null,
    conference_data: data.conferenceData ?? null,
    raw: data,
  };
}

/** Fetch event by id — used for evidence verification. */
export async function fetchNsCalendarEvent(
  calendarEventId: string,
  options?: { coachUserId?: string | null }
): Promise<Record<string, unknown>> {
  const { accessToken } = await getValidNsCoachCalendarAccessToken(
    options?.coachUserId
  );
  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(calendarEventId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      data.error?.message || `Google Calendar fetch failed (${res.status})`
    );
  }
  return data;
}

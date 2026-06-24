/**
 * pushEventToGoogleCalendar — Creates or updates an app Event in Google Calendar.
 * Called from the frontend (manual sync button) or entity automation.
 * Payload: { event_id: string, action: 'create' | 'update' | 'delete' }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const { event_id, action = 'create' } = await req.json();
    const base44 = createClientFromRequest(req);

    // Auth check
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    // Load the app event
    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (events.length === 0) return Response.json({ error: 'Event not found' }, { status: 404 });
    const appEvent = events[0];

    // Skip events that originated from Google (avoid echo loop)
    if (appEvent.source === 'google_calendar') {
      return Response.json({ status: 'skipped_google_origin' });
    }

    const gcalPayload = buildGCalPayload(appEvent);
    const existingGcalId = appEvent.external_calendar_id;
    const BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    let gcalEventId = existingGcalId;

    if (action === 'delete' && existingGcalId) {
      const res = await fetch(`${BASE_URL}/${existingGcalId}`, { method: 'DELETE', headers: authHeader });
      console.log('Deleted GCal event:', existingGcalId, res.status);
      // Clear the external ID from app event
      await base44.asServiceRole.entities.Event.update(event_id, {
        external_calendar_id: '',
        is_synced: false,
        source: 'app',
      });
      return Response.json({ status: 'deleted' });
    }

    if (action === 'update' && existingGcalId) {
      const res = await fetch(`${BASE_URL}/${existingGcalId}`, {
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(gcalPayload),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('GCal update error:', res.status, err);
        // If 404 (event deleted on Google side), recreate it
        if (res.status === 404) {
          return await createGCalEvent(base44, authHeader, BASE_URL, event_id, gcalPayload);
        }
        return Response.json({ error: err }, { status: res.status });
      }
      const data = await res.json();
      await base44.asServiceRole.entities.Event.update(event_id, { is_synced: true, external_calendar_id: data.id });
      console.log('Updated GCal event:', data.id);
      return Response.json({ status: 'updated', gcal_id: data.id });
    }

    // Create
    return await createGCalEvent(base44, authHeader, BASE_URL, event_id, gcalPayload);

  } catch (error) {
    console.error('pushEventToGoogleCalendar error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function createGCalEvent(base44, authHeader, BASE_URL, event_id, gcalPayload) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify(gcalPayload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('GCal create error:', res.status, err);
    return Response.json({ error: err }, { status: res.status });
  }
  const data = await res.json();
  await base44.asServiceRole.entities.Event.update(event_id, {
    external_calendar_id: data.id,
    external_calendar_type: 'google',
    is_synced: true,
  });
  console.log('Created GCal event:', data.id);
  return Response.json({ status: 'created', gcal_id: data.id });
}

function buildGCalPayload(appEvent) {
  const isAllDay = appEvent.is_all_day;
  const start = new Date(appEvent.start_date);
  const end   = new Date(appEvent.end_date || appEvent.start_date);

  const payload = {
    summary: appEvent.title,
    description: appEvent.description || '',
    location: appEvent.location || '',
  };

  if (isAllDay) {
    payload.start = { date: start.toISOString().split('T')[0] };
    payload.end   = { date: end.toISOString().split('T')[0] };
  } else {
    payload.start = { dateTime: start.toISOString() };
    payload.end   = { dateTime: end.toISOString() };
  }

  // Reminders
  if (appEvent.reminders?.length > 0) {
    payload.reminders = {
      useDefault: false,
      overrides: appEvent.reminders
        .filter(r => r.type !== 'email')
        .map(r => ({ method: 'popup', minutes: r.minutes_before || 30 }))
        .slice(0, 5),
    };
  }

  return payload;
}
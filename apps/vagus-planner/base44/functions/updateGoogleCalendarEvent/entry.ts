import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { google_event_id, title, description, start_date, end_date, location } = await req.json();

    if (!google_event_id) {
      return Response.json({ error: 'Missing event ID' }, { status: 400 });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch existing event
    const getResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!getResponse.ok) {
      throw new Error('Event not found in Google Calendar');
    }

    const existingEvent = await getResponse.json();

    // Update event
    const updatedEvent = {
      ...existingEvent,
      summary: title || existingEvent.summary,
      description: description !== undefined ? description : existingEvent.description,
      location: location || existingEvent.location,
      start: start_date ? {
        dateTime: new Date(start_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      } : existingEvent.start,
      end: end_date ? {
        dateTime: new Date(end_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      } : existingEvent.end
    };

    const updateResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatedEvent)
      }
    );

    if (!updateResponse.ok) {
      throw new Error('Failed to update Google Calendar event');
    }

    return Response.json({
      success: true,
      message: 'Event updated in Google Calendar'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
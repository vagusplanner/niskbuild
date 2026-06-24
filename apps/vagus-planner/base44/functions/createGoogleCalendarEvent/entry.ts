import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, start_date, end_date, location } = await req.json();

    if (!title || !start_date || !end_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Create event in Google Calendar
    const googleEvent = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: new Date(start_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(end_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(googleEvent)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${error}`);
    }

    const createdEvent = await response.json();

    // Also create in app database for reference
    await base44.entities.Event.create({
      title,
      description: description || '',
      start_date,
      end_date,
      location: location || '',
      external_calendar_id: createdEvent.id,
      external_calendar_type: 'google',
      source: 'app'
    });

    return Response.json({
      success: true,
      google_event_id: createdEvent.id,
      message: 'Event created in Google Calendar'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
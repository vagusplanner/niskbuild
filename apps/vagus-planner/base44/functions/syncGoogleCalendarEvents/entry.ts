import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch events from Google Calendar
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&orderBy=startTime&singleEvents=true&timeMin=' + 
      new Date().toISOString(),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events');
    }

    const googleEvents = await response.json();
    const events = googleEvents.items || [];

    // Convert Google Calendar events to app format and sync
    const convertedEvents = events.map(event => ({
      title: event.summary,
      description: event.description || '',
      start_date: new Date(event.start.dateTime || event.start.date).toISOString(),
      end_date: new Date(event.end.dateTime || event.end.date).toISOString(),
      external_calendar_id: event.id,
      external_calendar_type: 'google',
      location: event.location || '',
      source: 'google_calendar'
    }));

    // Create or update events in app database
    for (const event of convertedEvents) {
      try {
        // Check if event already exists
        const existing = await base44.entities.Event.filter({
          external_calendar_id: event.external_calendar_id,
          external_calendar_type: 'google'
        });

        if (!existing || existing.length === 0) {
          await base44.entities.Event.create(event);
        }
      } catch (e) {
        console.log('Event sync error:', e.message);
      }
    }

    return Response.json({
      success: true,
      synced_count: convertedEvents.length,
      events: convertedEvents
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
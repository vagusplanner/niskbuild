import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendarId } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch events from Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events?maxResults=250&orderBy=startTime&singleEvents=true&timeMin=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const googleEvents = await response.json();
    const events = googleEvents.items || [];

    // Convert Google Calendar events to Vagus Planner format
    const convertedEvents = events.map(event => ({
      title: event.summary || 'Untitled',
      description: event.description || '',
      start_date: event.start.dateTime || event.start.date,
      end_date: event.end.dateTime || event.end.date,
      is_all_day: !event.start.dateTime,
      category: 'work',
      location: event.location || '',
      external_calendar_type: 'google',
      external_calendar_id: event.id,
      source: 'google_calendar',
      is_synced: true,
      notes: `Synced from Google Calendar (${calendarId || 'primary'})`
    }));

    // Fetch existing synced events
    const existingEvents = await base44.entities.Event.filter({
      source: 'google_calendar',
      external_calendar_type: 'google'
    });

    const existingIds = new Set(existingEvents.map(e => e.external_calendar_id));

    // Create new events, update existing ones
    for (const event of convertedEvents) {
      const existing = existingEvents.find(e => e.external_calendar_id === event.external_calendar_id);
      if (existing) {
        await base44.entities.Event.update(existing.id, event);
      } else {
        await base44.entities.Event.create(event);
      }
    }

    // Update last sync time
    const settings = await base44.entities.UserSettings.list();
    if (settings.length > 0) {
      await base44.entities.UserSettings.update(settings[0].id, {
        google_calendar_last_sync: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      syncedCount: convertedEvents.length,
      message: `Synced ${convertedEvents.length} events from Google Calendar`
    });
  } catch (error) {
    console.error('Google Calendar sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
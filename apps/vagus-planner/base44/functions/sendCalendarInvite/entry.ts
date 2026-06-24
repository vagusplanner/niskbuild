import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      attendees, 
      location 
    } = await req.json();
    
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    
    // Create Google Calendar event
    const event = {
      summary: title,
      description: description || '',
      location: location || '',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees.map(email => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }
    
    const createdEvent = await response.json();
    
    // Create event in app database
    await base44.entities.Event.create({
      title,
      description,
      start_date: startTime,
      end_date: endTime,
      location,
      category: 'work',
      external_calendar_type: 'google',
      external_calendar_id: createdEvent.id,
      is_synced: true
    });
    
    return Response.json({
      success: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink,
      meetingLink: createdEvent.hangoutLink
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
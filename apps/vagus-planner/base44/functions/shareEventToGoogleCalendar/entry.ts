import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sync event to Google Calendar
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      event_id,
      event_data
    } = await req.json();

    if (!event_id || !event_data) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Build the event object for Google Calendar
    const googleEvent = {
      summary: event_data.title,
      description: event_data.description || '',
      location: event_data.location || '',
      start: {
        dateTime: new Date(event_data.start_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(event_data.end_date || event_data.start_date).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Get primary calendar ID
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!calendarResponse.ok) {
      return Response.json(
        { 
          success: false,
          error: 'Could not access Google Calendar'
        },
        { status: 400 }
      );
    }

    // Create event in Google Calendar
    const createResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleEvent)
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return Response.json(
        { 
          success: false,
          error: error.error?.message || 'Failed to create event in Google Calendar'
        },
        { status: createResponse.status }
      );
    }

    const createdEvent = await createResponse.json();

    // Update the event record in our database to track sync
    try {
      await base44.entities.Event.update(event_id, {
        external_calendar_type: 'google',
        external_calendar_id: createdEvent.id,
        is_synced: true
      });
    } catch (err) {
      console.error('Failed to update event sync status:', err);
    }

    // Log the action
    try {
      await base44.asServiceRole.entities.IntegrationLog?.create?.({
        user_email: user.email,
        action: 'sync_event_to_google_calendar',
        integration_type: 'googlecalendar',
        event_id,
        metadata: {
          google_event_id: createdEvent.id
        },
        created_at: new Date().toISOString()
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to log integration action:', err);
    }

    return Response.json({
      success: true,
      google_event_id: createdEvent.id,
      event_link: createdEvent.htmlLink
    });
  } catch (error) {
    console.error('Error syncing to Google Calendar:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
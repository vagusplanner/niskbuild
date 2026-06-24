import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { google_event_id } = await req.json();

    if (!google_event_id) {
      return Response.json({ error: 'Missing event ID' }, { status: 400 });
    }

    // Get access token for Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Delete event from Google Calendar
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!deleteResponse.ok && deleteResponse.status !== 204) {
      throw new Error('Failed to delete Google Calendar event');
    }

    return Response.json({
      success: true,
      message: 'Event deleted from Google Calendar'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
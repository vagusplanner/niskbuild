import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, calendar_type } = await req.json();

    // Get access token for the calendar service
    const accessToken = await base44.asServiceRole.connectors.getAccessToken(
      calendar_type === 'google' ? 'googlecalendar' : 'outlook'
    );

    if (action === 'import') {
      return await importEvents(base44, accessToken, calendar_type, user);
    } else if (action === 'export') {
      return await exportEvents(base44, accessToken, calendar_type, user);
    } else if (action === 'two_way_sync') {
      return await twoWaySync(base44, accessToken, calendar_type, user);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Enhanced sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function importEvents(base44, accessToken, calendarType, user) {
  if (calendarType === 'google') {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
      new Date().toISOString() + '&maxResults=100',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    let imported = 0;

    for (const gEvent of data.items || []) {
      const existingEvents = await base44.asServiceRole.entities.Event.filter({
        external_calendar_id: gEvent.id
      });

      if (existingEvents.length === 0) {
        await base44.asServiceRole.entities.Event.create({
          title: gEvent.summary || 'Untitled',
          description: gEvent.description || '',
          start_date: gEvent.start?.dateTime || gEvent.start?.date,
          end_date: gEvent.end?.dateTime || gEvent.end?.date,
          location: gEvent.location || '',
          external_calendar_type: 'google',
          external_calendar_id: gEvent.id,
          source: 'google_calendar',
          is_synced: true,
          created_by: user.email
        });
        imported++;
      }
    }

    return Response.json({ imported, calendar_type: 'google' });
  }

  return Response.json({ imported: 0 });
}

async function exportEvents(base44, accessToken, calendarType, user) {
  if (calendarType === 'google') {
    const localEvents = await base44.asServiceRole.entities.Event.filter({
      created_by: user.email,
      source: 'app'
    });

    let exported = 0;

    for (const event of localEvents) {
      if (event.external_calendar_id) continue;

      const gEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.start_date,
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.end_date,
          timeZone: 'UTC'
        },
        location: event.location || ''
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(gEvent)
        }
      );

      const created = await response.json();

      await base44.asServiceRole.entities.Event.update(event.id, {
        external_calendar_id: created.id,
        external_calendar_type: 'google',
        is_synced: true
      });

      exported++;
    }

    return Response.json({ exported, calendar_type: 'google' });
  }

  return Response.json({ exported: 0 });
}

async function twoWaySync(base44, accessToken, calendarType, user) {
  const importResult = await importEvents(base44, accessToken, calendarType, user);
  const importData = await importResult.json();
  
  const exportResult = await exportEvents(base44, accessToken, calendarType, user);
  const exportData = await exportResult.json();

  return Response.json({
    imported: importData.imported,
    exported: exportData.exported,
    calendar_type: calendarType
  });
}
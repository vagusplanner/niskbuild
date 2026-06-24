import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get Google Calendar access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

        // Fetch events from Google Calendar (next 30 days)
        const now = new Date();
        const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        const calendarResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${now.toISOString()}&timeMax=${futureDate.toISOString()}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!calendarResponse.ok) {
            const error = await calendarResponse.text();
            return Response.json({ error: 'Failed to fetch from Google Calendar', details: error }, { status: 500 });
        }

        const data = await calendarResponse.json();
        const googleEvents = data.items || [];

        // Get existing events to avoid duplicates
        const existingEvents = await base44.entities.Event.list();
        const existingGoogleIds = new Set(
            existingEvents
                .filter(e => e.google_calendar_id)
                .map(e => e.google_calendar_id)
        );

        // Import new events
        let importedCount = 0;
        for (const gEvent of googleEvents) {
            // Skip if already imported
            if (existingGoogleIds.has(gEvent.id)) continue;

            const startDateTime = gEvent.start.dateTime || gEvent.start.date;
            const endDateTime = gEvent.end.dateTime || gEvent.end.date;
            const isAllDay = !gEvent.start.dateTime;

            // Format dates properly for Event entity
            const startDate = new Date(startDateTime);
            const endDate = new Date(endDateTime);

            await base44.asServiceRole.entities.Event.create({
                title: gEvent.summary || 'Untitled Event',
                description: gEvent.description || '',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                is_all_day: isAllDay,
                location: gEvent.location || '',
                category: 'other',
                external_calendar_id: gEvent.id,
                external_calendar_type: 'google',
                source: 'google_calendar',
                created_by: user.email
            });

            importedCount++;
        }

        return Response.json({ 
            success: true, 
            imported: importedCount,
            total: googleEvents.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
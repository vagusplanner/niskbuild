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

        // Get events that haven't been synced to Google Calendar
        const allEvents = await base44.entities.Event.filter({ created_by: user.email });
        const eventsToSync = allEvents.filter(e => 
            !e.external_calendar_id && 
            e.source !== 'google_calendar' &&
            e.start_date // Must have a start_date
        );

        let exportedCount = 0;
        for (const event of eventsToSync) {
            try {
                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                
                const startDateTime = event.is_all_day 
                    ? { date: startDate.toISOString().split('T')[0] }
                    : { dateTime: startDate.toISOString() };
                
                const endDateTime = event.is_all_day
                    ? { date: endDate.toISOString().split('T')[0] }
                    : { dateTime: endDate.toISOString() };

                const googleEvent = {
                    summary: event.title,
                    description: event.description || '',
                    location: event.location || '',
                    start: startDateTime,
                    end: endDateTime
                };

                const response = await fetch(
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

                if (response.ok) {
                    const createdEvent = await response.json();
                    
                    // Update local event with Google Calendar ID
                    await base44.asServiceRole.entities.Event.update(event.id, {
                        external_calendar_id: createdEvent.id,
                        external_calendar_type: 'google',
                        is_synced: true
                    });
                    
                    exportedCount++;
                }
            } catch (error) {
                console.error('Error syncing event:', error);
                continue;
            }
        }

        return Response.json({ 
            success: true, 
            exported: exportedCount,
            total: eventsToSync.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
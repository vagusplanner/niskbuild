import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, new_event_data } = await req.json();

    // Get all events from local calendar
    const localEvents = await base44.entities.Event.list();

    // Get Google Calendar events
    let externalEvents = [];
    try {
      const googleToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
      
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + 
        new Date().toISOString() + '&maxResults=200',
        { headers: { Authorization: `Bearer ${googleToken}` } }
      );
      
      const data = await response.json();
      externalEvents = (data.items || []).map(gEvent => ({
        id: gEvent.id,
        title: gEvent.summary || 'Untitled',
        start_date: gEvent.start?.dateTime || gEvent.start?.date,
        end_date: gEvent.end?.dateTime || gEvent.end?.date,
        source: 'google_calendar'
      }));
    } catch (error) {
      console.log('Could not fetch Google Calendar:', error.message);
    }

    // Combine all events
    const allEvents = [...localEvents, ...externalEvents];

    // Check for conflicts
    const eventToCheck = new_event_data || (
      event_id ? localEvents.find(e => e.id === event_id) : null
    );

    if (!eventToCheck) {
      return Response.json({ conflicts: [] });
    }

    const conflicts = [];
    const eventStart = new Date(eventToCheck.start_date);
    const eventEnd = new Date(eventToCheck.end_date);

    for (const existingEvent of allEvents) {
      if (existingEvent.id === event_id) continue;

      const existingStart = new Date(existingEvent.start_date);
      const existingEnd = new Date(existingEvent.end_date);

      // Check for overlap
      const hasOverlap = 
        (eventStart >= existingStart && eventStart < existingEnd) ||
        (eventEnd > existingStart && eventEnd <= existingEnd) ||
        (eventStart <= existingStart && eventEnd >= existingEnd);

      if (hasOverlap) {
        conflicts.push({
          event: existingEvent,
          overlap_type: 
            eventStart < existingStart && eventEnd > existingEnd ? 'complete' :
            eventStart < existingStart ? 'start' :
            eventEnd > existingEnd ? 'end' : 'partial',
          calendar_source: existingEvent.source || 'app'
        });
      }
    }

    // Generate AI suggestions for conflicts
    if (conflicts.length > 0) {
      const suggestions = await generateRescheduleSuggestions(
        base44,
        eventToCheck,
        conflicts,
        allEvents
      );

      return Response.json({
        has_conflicts: true,
        conflicts,
        ai_suggestions: suggestions
      });
    }

    return Response.json({
      has_conflicts: false,
      conflicts: []
    });

  } catch (error) {
    console.error('Conflict detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateRescheduleSuggestions(base44, event, conflicts, allEvents) {
  const suggestions = [];
  const eventDuration = new Date(event.end_date) - new Date(event.start_date);
  const originalStart = new Date(event.start_date);

  // Try to find alternative time slots
  const timeSlots = [
    { hours: 1, label: '1 hour later' },
    { hours: 2, label: '2 hours later' },
    { hours: -1, label: '1 hour earlier' },
    { hours: -2, label: '2 hours earlier' },
    { hours: 24, label: 'Same time tomorrow' },
    { hours: -24, label: 'Same time yesterday' }
  ];

  for (const slot of timeSlots) {
    const newStart = new Date(originalStart.getTime() + slot.hours * 60 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + eventDuration);

    // Check if this slot is free
    const hasConflict = allEvents.some(e => {
      if (e.id === event.id) return false;
      const eStart = new Date(e.start_date);
      const eEnd = new Date(e.end_date);
      return (
        (newStart >= eStart && newStart < eEnd) ||
        (newEnd > eStart && newEnd <= eEnd) ||
        (newStart <= eStart && newEnd >= eEnd)
      );
    });

    if (!hasConflict) {
      suggestions.push({
        action: `Reschedule to ${slot.label}`,
        new_start_date: newStart.toISOString(),
        new_end_date: newEnd.toISOString(),
        event_id: event.id,
        rationale: `Move ${event.title} ${slot.label} to avoid conflicts`,
        confidence: slot.hours === 1 ? 90 : slot.hours === -1 ? 85 : 75
      });
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
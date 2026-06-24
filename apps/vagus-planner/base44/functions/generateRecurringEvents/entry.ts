import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, count = 12 } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'Missing event_id' }, { status: 400 });
    }

    const parentEvent = await base44.entities.Event.filter({ id: event_id });
    if (!parentEvent || parentEvent.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = parentEvent[0];
    if (!event.is_recurring) {
      return Response.json({ error: 'Event is not recurring' }, { status: 400 });
    }

    const generatedEvents = [];
    let currentDate = new Date(event.start_date);
    const endDate = event.recurrence_end_date ? new Date(event.recurrence_end_date) : null;

    for (let i = 0; i < count; i++) {
      if (endDate && currentDate > endDate) break;

      const startDate = new Date(currentDate);
      const duration = new Date(event.end_date) - new Date(event.start_date);
      const endDateNew = new Date(startDate.getTime() + duration);

      // Check if this instance already exists to prevent duplicates
      const existingInstance = await base44.entities.Event.filter({
        parent_recurring_event_id: event_id,
        start_date: startDate.toISOString()
      });

      if (existingInstance.length === 0) {
        await base44.entities.Event.create({
          title: event.title,
          description: event.description,
          start_date: startDate.toISOString(),
          end_date: endDateNew.toISOString(),
          category: event.category,
          location: event.location,
          is_all_day: event.is_all_day,
          reminders: event.reminders,
          color: event.color,
          parent_recurring_event_id: event_id,
          is_recurring: false
        });

        generatedEvents.push({
          start: startDate.toISOString(),
          end: endDateNew.toISOString()
        });
      }

      // Increment date based on recurrence type
      switch (event.recurrence_type) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }

    return Response.json({
      success: true,
      generated_count: generatedEvents.length,
      events: generatedEvents
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Handle entity automation payload
    let event_id;
    if (payload.event?.type) {
      // Called from entity automation
      event_id = payload.event.entity_id;
    } else if (payload.event_id) {
      // Direct function call
      event_id = payload.event_id;
    }

    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the event
    const events = await base44.entities.Event.filter({ id: event_id });
    const event = events[0];

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Analyze event and suggest optimizations using AI
    const allEvents = await base44.entities.Event.list('-created_date', 50);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this event and suggest automatic updates based on common workflow patterns.

Event: ${JSON.stringify(event, null, 2)}

Recent Events Context:
${JSON.stringify(allEvents.slice(0, 10).map(e => ({
  title: e.title,
  category: e.category,
  start_time: e.start_time,
  end_time: e.end_time,
  location: e.location,
  reminder_minutes: e.reminder_minutes
})), null, 2)}

Suggest automatic updates if:
1. Similar events typically have specific locations
2. Common reminder times for this category
3. Typical duration for this type of event
4. Should be recurring based on title patterns
5. Missing important details that similar events have

Only suggest updates if you're highly confident (>70%). Return null for fields that don't need updates.`,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_updates: {
            type: "object",
            properties: {
              location: { type: "string" },
              reminder_minutes: { type: "number" },
              end_time: { type: "string" },
              is_recurring: { type: "boolean" },
              recurrence_type: { type: "string" },
              color: { type: "string" }
            }
          },
          confidence: { type: "number" },
          reasoning: { type: "string" },
          should_auto_apply: { type: "boolean" }
        }
      }
    });

    const updates = {};
    let applied = false;

    // Auto-apply if confidence is very high and should_auto_apply is true
    if (result.confidence > 0.8 && result.should_auto_apply) {
      const suggested = result.suggested_updates;
      
      if (suggested.location && !event.location) updates.location = suggested.location;
      if (suggested.reminder_minutes && !event.reminder_minutes) updates.reminder_minutes = suggested.reminder_minutes;
      if (suggested.end_time && !event.end_time) updates.end_time = suggested.end_time;
      if (suggested.is_recurring !== undefined && !event.is_recurring) {
        updates.is_recurring = suggested.is_recurring;
        if (suggested.recurrence_type) updates.recurrence_type = suggested.recurrence_type;
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.Event.update(event_id, updates);
        applied = true;

        // Create a comment explaining the auto-update
        await base44.entities.EventComment.create({
          event_id,
          user_email: 'ai@assistant.app',
          user_name: 'AI Assistant',
          message: `🤖 Auto-updated: ${result.reasoning}`
        });
      }
    }

    return Response.json({
      event_id,
      analyzed: true,
      updates_applied: applied,
      suggested_updates: result.suggested_updates,
      reasoning: result.reasoning,
      confidence: result.confidence
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
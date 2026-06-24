import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, user_location, user_availability, event_type } = await req.json();

    // Calculate smart reminder times based on event type and logistics
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate smart reminders for this event, considering preparation and travel:

Event: ${event.title}
Date: ${event.start_date}
Type: ${event_type}
Location: ${user_location?.city || 'Unknown'}
User Availability: ${JSON.stringify(user_availability || {})}

Return JSON with smart reminder times:
{
  "reminders": [
    {
      "title": "Reminder name",
      "time_before_minutes": number,
      "description": "What to do",
      "type": "prep|travel|notification|check-in"
    }
  ],
  "total_prep_time_hours": number,
  "notes": "Special considerations"
}

Rules:
- Travel reminders: add 30-60min before for local, 24h+ for Hajj/travel
- Prep reminders: add 2-4h before for regular events, 7+ days for Hajj/Umrah
- Islamic events: add spiritual prep reminders
- Respect user's work/sleep hours where possible`,
      response_json_schema: {
        type: 'object',
        properties: {
          reminders: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                time_before_minutes: { type: 'number' },
                description: { type: 'string' },
                type: { type: 'string' }
              }
            }
          },
          total_prep_time_hours: { type: 'number' },
          notes: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      reminders: response.reminders || [],
      total_prep_time_hours: response.total_prep_time_hours,
      notes: response.notes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
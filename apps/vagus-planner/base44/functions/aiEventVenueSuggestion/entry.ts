import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { location, date, attendees, event_type, budget } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert event venue consultant. Based on the following event details, suggest 5 ideal venues with specific reasoning. Format as JSON.

Event Details:
- Location: ${location}
- Date: ${date}
- Estimated Attendees: ${attendees}
- Event Type: ${event_type}
- Budget: ${budget}

Provide suggestions in this JSON format:
{
  "venues": [
    {
      "name": "Venue Name",
      "type": "venue type",
      "location": "specific address/area",
      "capacity": number,
      "estimated_cost": "price range",
      "key_features": ["feature1", "feature2"],
      "pros": ["pro1", "pro2"],
      "cons": ["con1"],
      "booking_lead_time": "recommended weeks in advance",
      "accessibility_notes": "accessibility info"
    }
  ],
  "general_tips": ["tip1", "tip2", "tip3"]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          venues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                location: { type: 'string' },
                capacity: { type: 'number' },
                estimated_cost: { type: 'string' },
                key_features: { type: 'array', items: { type: 'string' } },
                pros: { type: 'array', items: { type: 'string' } },
                cons: { type: 'array', items: { type: 'string' } },
                booking_lead_time: { type: 'string' },
                accessibility_notes: { type: 'string' }
              }
            }
          },
          general_tips: { type: 'array', items: { type: 'string' } }
        }
      },
      add_context_from_internet: true
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
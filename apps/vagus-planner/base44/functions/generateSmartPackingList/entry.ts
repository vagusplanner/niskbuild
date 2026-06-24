import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, duration_days, activities, start_date } = await req.json();

    // Get weather forecast for destination
    const weatherInfo = await base44.integrations.Core.InvokeLLM({
      prompt: `What is the typical weather in ${destination} around ${start_date}? Provide temperature range, precipitation, and what to expect.`,
      add_context_from_internet: true
    });

    // Get user preferences
    const settings = await base44.entities.UserSettings.list();
    const userPreferences = settings[0] || {};
    const dietaryNeeds = userPreferences.dietary_preferences || [];

    // Generate smart packing list
    const packingList = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a travel packing expert. Generate a comprehensive, personalized packing list.

Trip Details:
- Destination: ${destination}
- Duration: ${duration_days} days
- Activities: ${activities?.join(', ') || 'General tourism'}
- Weather: ${weatherInfo}
- Dietary Needs: ${dietaryNeeds.join(', ') || 'None'}

Create a smart packing list organized by category. Include:
1. Clothing (weather-appropriate)
2. Toiletries & personal care
3. Electronics & gadgets
4. Documents & money
5. Health & medications
6. Activity-specific gear
7. Comfort items for this specific destination

Be specific and practical. Consider cultural norms, climate, and activities.

Return as JSON:
{
  "categories": [
    {
      "name": "Clothing",
      "items": [
        {
          "item": "Item name",
          "quantity": 2,
          "reason": "Why needed",
          "priority": "essential|recommended|optional"
        }
      ]
    }
  ],
  "travel_tips": ["tip1", "tip2", "tip3"],
  "weather_summary": "Brief weather summary"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      item: { type: 'string' },
                      quantity: { type: 'number' },
                      reason: { type: 'string' },
                      priority: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          travel_tips: { type: 'array', items: { type: 'string' } },
          weather_summary: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      packing_list: packingList,
      destination,
      weather: weatherInfo
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
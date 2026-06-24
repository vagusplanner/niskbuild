import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budget, duration_days, travel_style } = await req.json();

    // Fetch user's travel history and preferences
    const pastHolidays = await base44.entities.Holiday.list('-start_date', 20);
    const settings = await base44.entities.UserSettings.list();
    const goals = await base44.entities.Goal.filter({ status: 'active' });

    const userPreferences = settings[0] || {};
    const travelInterests = userPreferences.travel_interests || [];
    const dietaryPreferences = userPreferences.dietary_preferences || [];

    // Analyze past destinations
    const pastDestinations = pastHolidays.map(h => h.destination).filter(Boolean);
    const avgBudget = pastHolidays.length > 0 
      ? pastHolidays.reduce((sum, h) => sum + (h.budget || 0), 0) / pastHolidays.length
      : budget;

    // Generate personalized suggestions
    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert travel advisor creating personalized trip suggestions.

User Profile:
- Past Destinations: ${pastDestinations.join(', ') || 'None'}
- Travel Interests: ${travelInterests.join(', ') || 'General exploration'}
- Dietary Preferences: ${dietaryPreferences.join(', ') || 'No restrictions'}
- Typical Budget: $${avgBudget}
- Active Goals: ${goals.map(g => g.title).join(', ') || 'None'}

Current Trip Parameters:
- Budget: $${budget}
- Duration: ${duration_days} days
- Style: ${travel_style || 'balanced'}

Task: Suggest 5 personalized travel destinations that match this user's profile and preferences. For each destination:
1. Explain why it's perfect for THIS user specifically
2. Suggest 5 must-do activities aligned with their interests
3. Break down realistic budget (flights, accommodation, food, activities)
4. Best time to visit
5. Hidden gems they'd love based on their profile

Return as JSON:
{
  "suggestions": [
    {
      "destination": "City, Country",
      "why_perfect": "Personalized reason",
      "activities": ["activity1", "activity2", "activity3", "activity4", "activity5"],
      "budget_breakdown": {
        "flights": 500,
        "accommodation": 800,
        "food": 400,
        "activities": 300,
        "total": 2000
      },
      "best_time": "Season/months",
      "hidden_gems": ["gem1", "gem2", "gem3"],
      "match_score": 95
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                destination: { type: 'string' },
                why_perfect: { type: 'string' },
                activities: { type: 'array', items: { type: 'string' } },
                budget_breakdown: { type: 'object' },
                best_time: { type: 'string' },
                hidden_gems: { type: 'array', items: { type: 'string' } },
                match_score: { type: 'number' }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggestions: suggestions.suggestions,
      personalized_for: user.email
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
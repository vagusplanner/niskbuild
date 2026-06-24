import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      current_location = 'Mecca',
      user_interests = [],
      mobility_level = 'normal',
      time_available_hours = 2,
      budget_usd = 100,
      visited_places = [],
      time_of_day = 'afternoon'
    } = await req.json();

    const recommendations = await base44.integrations.Core.InvokeLLM({
      prompt: `As an AI concierge for pilgrims in ${current_location}, provide personalized local recommendations.

User Profile:
- Interests: ${user_interests.join(', ')}
- Mobility Level: ${mobility_level}
- Available Time: ${time_available_hours} hours
- Budget: $${budget_usd}
- Time of Day: ${time_of_day}
- Already Visited: ${visited_places.join(', ') || 'None'}

Generate 3-5 curated recommendations in JSON format:
{
  "recommendations": [
    {
      "type": "restaurant|activity|site|experience|shopping",
      "name": "place/activity name",
      "description": "compelling description",
      "why_recommended": "personalized reason based on user interests",
      "location": "area/address",
      "duration_minutes": number,
      "cost_usd": number,
      "crowd_level_estimate": "low|moderate|high at this time",
      "best_visit_time": "when to go",
      "accessibility_rating": "1-5 for mobility level",
      "highlights": ["feature 1", "feature 2"],
      "booking_available": true/false,
      "cultural_significance": "if relevant",
      "photography_worthy": true/false
    }
  ],
  "itinerary_suggestion": "how to chain these together optimally",
  "transportation_notes": "how to get between locations",
  "estimated_total_cost": number,
  "local_insights": ["cultural tip", "practical tip"],
  "contingency_plans": "if too crowded or weather changes"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          recommendations: { type: "array" },
          itinerary_suggestion: { type: "string" },
          transportation_notes: { type: "string" },
          estimated_total_cost: { type: "number" },
          local_insights: { type: "array" },
          contingency_plans: { type: "string" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      recommendations: recommendations,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
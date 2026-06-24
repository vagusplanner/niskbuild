import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      question,
      current_location = 'Mecca',
      context_type = 'general',
      interests = [],
      visited_places = []
    } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI concierge for pilgrims in ${current_location}. Answer this question with practical, location-specific guidance.

User Question: "${question}"
Context Type: ${context_type}
User Interests: ${interests.join(', ') || 'General'}
Already Visited: ${visited_places.join(', ') || 'None'}

Provide a response in JSON format:
{
  "answer": "direct, helpful answer to the question",
  "category": "restaurants|prayer|directions|accommodation|shopping|healthcare|activity|other",
  "specific_locations": [
    {
      "name": "place name",
      "description": "what it is",
      "distance_km": number,
      "estimated_travel_time_minutes": number,
      "address": "address if available",
      "why_recommended": "why this suits the user",
      "opening_hours": "hours if relevant",
      "ratings_score": "user rating if known"
    }
  ],
  "practical_tips": [
    "tip 1",
    "tip 2"
  ],
  "best_time_to_visit": "when to go (considering crowds/prayer times)",
  "cost_estimate": "estimated cost range in USD",
  "booking_needed": true/false,
  "accessibility_info": "wheelchair/mobility info if relevant",
  "safety_notes": "any safety considerations",
  "follow_up_questions": [
    "would you like to...",
    "are you interested in..."
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          category: { type: "string" },
          specific_locations: { type: "array" },
          practical_tips: { type: "array", items: { type: "string" } },
          best_time_to_visit: { type: "string" },
          cost_estimate: { type: "string" },
          booking_needed: { type: "boolean" },
          accessibility_info: { type: "string" },
          safety_notes: { type: "string" },
          follow_up_questions: { type: "array", items: { type: "string" } }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      concierge_response: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Concierge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
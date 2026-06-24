import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      pilgrimage_type = 'hajj',
      duration_days,
      budget_usd,
      mobility_level = 'normal',
      group_size = 1,
      spiritual_focus = [],
      interests = [],
      accessibility_needs = [],
      preferred_pace = 'moderate',
      travel_dates = {}
    } = await req.json();

    const plan = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a highly personalized ${pilgrimage_type} itinerary based on these preferences:

Duration: ${duration_days} days
Budget: $${budget_usd}
Mobility Level: ${mobility_level}
Group Size: ${group_size} people
Spiritual Focus: ${spiritual_focus.join(', ') || 'General'}
Interests: ${interests.join(', ')}
Accessibility Needs: ${accessibility_needs.join(', ') || 'None'}
Preferred Pace: ${preferred_pace}
Travel Dates: ${JSON.stringify(travel_dates)}

Generate a comprehensive itinerary in JSON format:
{
  "plan_id": "unique-id",
  "title": "personalized plan title",
  "summary": "brief overview",
  "daily_schedule": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "theme of the day",
      "morning": {
        "time": "HH:MM",
        "activity": "description",
        "duration_minutes": number,
        "location": "location name",
        "spiritual_significance": "why this matters",
        "crowd_level_estimate": "low|moderate|high",
        "best_time_to_visit": "recommendation"
      },
      "afternoon": { "time": "", "activity": "", "duration_minutes": 0, "location": "", "spiritual_significance": "", "crowd_level_estimate": "", "best_time_to_visit": "" },
      "evening": { "time": "", "activity": "", "duration_minutes": 0, "location": "", "spiritual_significance": "", "crowd_level_estimate": "", "best_time_to_visit": "" },
      "meals": ["breakfast location", "lunch location", "dinner location"],
      "prayer_times": { "fajr": "HH:MM", "dhuhr": "HH:MM", "asr": "HH:MM", "maghrib": "HH:MM", "isha": "HH:MM" },
      "rest_time_minutes": number,
      "accessibility_notes": "relevant modifications",
      "optional_activities": ["alternative activity 1", "alternative activity 2"],
      "estimated_walking_km": number,
      "physical_demand": "light|moderate|demanding"
    }
  ],
  "accommodation_recommendations": [
    {
      "location": "area name",
      "duration_nights": number,
      "budget_per_night": number,
      "proximity_to_key_sites": "description",
      "accessibility_rating": "1-5",
      "recommended_hotels": ["hotel 1", "hotel 2"]
    }
  ],
  "budget_breakdown": {
    "accommodation": number,
    "food": number,
    "transportation": number,
    "activities": number,
    "contingency": number,
    "total": number
  },
  "crowd_management_strategy": {
    "peak_times": ["time ranges to avoid"],
    "optimal_visiting_times": ["recommended times"],
    "alternative_routes": ["less crowded options"],
    "backup_activities": ["if too crowded, do this"]
  },
  "spiritual_enhancement": {
    "recommended_duas": ["dua 1", "dua 2"],
    "reflection_times": ["when to pause and reflect"],
    "educational_resources": ["recommended reading"],
    "community_engagement": ["ways to connect with others"]
  },
  "health_wellness": {
    "daily_water_intake_liters": number,
    "rest_schedule": "recommendation",
    "physical_preparation": ["exercises to do"],
    "emergency_contacts": "guidance",
    "medication_reminders": "if applicable"
  },
  "cultural_etiquette": [
    "cultural tip 1",
    "cultural tip 2"
  ],
  "flexibility_notes": "how to adjust based on circumstances",
  "personalization_score": "how well this matches preferences",
  "alternatives": {
    "if_budget_increases": "enhanced plan options",
    "if_time_allows": "additional activities",
    "if_mobility_limited": "modified schedule"
  }
}`,
      response_json_schema: {
        type: "object",
        properties: {
          plan_id: { type: "string" },
          title: { type: "string" },
          summary: { type: "string" },
          daily_schedule: { type: "array" },
          accommodation_recommendations: { type: "array" },
          budget_breakdown: { type: "object" },
          crowd_management_strategy: { type: "object" },
          spiritual_enhancement: { type: "object" },
          health_wellness: { type: "object" },
          cultural_etiquette: { type: "array" },
          flexibility_notes: { type: "string" },
          personalization_score: { type: "string" },
          alternatives: { type: "object" }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      plan: plan,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Plan generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
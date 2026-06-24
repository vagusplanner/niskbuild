import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, dietary_preferences = [], radius_km = 2 } = await req.json();

    const locationInfo = await base44.integrations.Core.InvokeLLM({
      prompt: `Find and provide information about halal restaurants and prayer facilities near coordinates (${latitude}, ${longitude}) in Saudi Arabia.

Search radius: ${radius_km}km
User dietary preferences: ${dietary_preferences.join(', ') || 'no specific preferences'}
Current date/time context: ${new Date().toISOString()}

Provide response in JSON format:
{
  "prayer_facilities": [
    {
      "name": "mosque or prayer area name",
      "type": "mosque|prayer_room|prayer_area",
      "distance_km": number,
      "prayer_times": {
        "fajr": "time",
        "dhuhr": "time",
        "asr": "time",
        "maghrib": "time",
        "isha": "time"
      },
      "facilities": ["ablution_area", "segregated_area", "air_conditioning", "etc"],
      "accessibility": "wheelchair/elderly accessible",
      "address": "full address",
      "current_congestion": "empty|moderate|crowded",
      "recommendations": "when best to pray here"
    }
  ],
  "halal_restaurants": [
    {
      "name": "restaurant name",
      "distance_km": number,
      "cuisine_type": "traditional|modern|fusion",
      "specialties": ["dish1", "dish2"],
      "price_range": "budget|moderate|expensive",
      "dietary_options": ["vegetarian", "vegan", "gluten_free", "etc"],
      "ratings": "rating out of 5",
      "address": "address",
      "operating_hours": "hours",
      "halal_certification": "certified|trusted|etc",
      "why_recommended": "why it's good for pilgrims",
      "current_wait_time": "estimated wait"
    }
  ],
  "quick_food_stalls": [
    {
      "name": "stall name",
      "distance_km": number,
      "specialty": "what they serve",
      "price": "price range",
      "quick_serve": true,
      "popular_items": ["item1", "item2"]
    }
  ],
  "hydration_points": [
    {
      "location": "location description",
      "distance_km": number,
      "type": "water_fountain|vendor|restaurant",
      "availability": "24/7|specific hours"
    }
  ],
  "recommendations": {
    "best_prayer_time": "suggested prayer location and time",
    "best_meal_option": "recommended restaurant based on time and preferences",
    "hydration_strategy": "when and where to hydrate",
    "crowd_analysis": "current crowd situation"
  }
}`,
      response_json_schema: {
        type: "object",
        properties: {
          prayer_facilities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                distance_km: { type: "number" },
                prayer_times: { type: "object" },
                facilities: { type: "array", items: { type: "string" } },
                accessibility: { type: "string" },
                address: { type: "string" },
                current_congestion: { type: "string" },
                recommendations: { type: "string" }
              }
            }
          },
          halal_restaurants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                distance_km: { type: "number" },
                cuisine_type: { type: "string" },
                specialties: { type: "array", items: { type: "string" } },
                price_range: { type: "string" },
                dietary_options: { type: "array", items: { type: "string" } },
                ratings: { type: "string" },
                address: { type: "string" },
                operating_hours: { type: "string" },
                halal_certification: { type: "string" },
                why_recommended: { type: "string" },
                current_wait_time: { type: "string" }
              }
            }
          },
          quick_food_stalls: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                distance_km: { type: "number" },
                specialty: { type: "string" },
                price: { type: "string" },
                quick_serve: { type: "boolean" },
                popular_items: { type: "array", items: { type: "string" } }
              }
            }
          },
          hydration_points: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                distance_km: { type: "number" },
                type: { type: "string" },
                availability: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "object",
            properties: {
              best_prayer_time: { type: "string" },
              best_meal_option: { type: "string" },
              hydration_strategy: { type: "string" },
              crowd_analysis: { type: "string" }
            }
          }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      user_location: { latitude, longitude },
      search_radius_km: radius_km,
      ...locationInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Location info fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
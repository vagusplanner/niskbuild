import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode, preferences } = await req.json();
    // mode: 'suggest' | 'itinerary'

    // Fetch user data
    const [settings, holidays, feedback] = await Promise.all([
      base44.entities.UserSettings.list(),
      base44.entities.Holiday.list('-start_date', 20),
      base44.entities.TripFeedback.list('-created_date', 10)
    ]);

    const userSettings = settings[0] || {};
    const pastTrips = holidays.filter(h => h.status === 'completed');
    
    if (mode === 'suggest') {
      // Suggest destinations based on user profile
      const prompt = `Suggest 6 personalized travel destinations for this user:

USER PROFILE:
- Budget range: ${preferences.budget || 'moderate'}
- Travel interests: ${userSettings.travel_interests?.join(', ') || 'varied'}
- Dietary preferences: ${userSettings.dietary_preferences?.join(', ') || 'none'}
- Duration: ${preferences.duration || '7'} days
- Travel style: ${preferences.style || 'balanced'}

PAST TRIPS:
${pastTrips.map(t => `- ${t.destination} (${t.status})`).join('\n') || 'First trip'}

TRIP FEEDBACK:
${feedback.map(f => `
- Destination rated: ${f.destination_rating}/5
- Would return: ${f.would_return ? 'Yes' : 'No'}
- Highlights: ${f.highlights?.join(', ') || 'N/A'}
`).join('\n') || 'No feedback yet'}

Consider:
- Avoid recently visited destinations unless rated 5 stars
- Match travel interests and style
- Stay within budget
- Suggest diverse options (beach, city, adventure, cultural)

For each destination provide: name, country, best season, estimated budget, why it matches, key attractions, and confidence score.`;

      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            destinations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  country: { type: "string" },
                  best_season: { type: "string" },
                  estimated_budget: { type: "number" },
                  why_matches: { type: "string" },
                  key_attractions: { type: "array", items: { type: "string" } },
                  vibe: { type: "string" },
                  confidence: { type: "string" }
                }
              }
            }
          }
        }
      });

      return Response.json(data);
    } else if (mode === 'itinerary') {
      // Generate detailed itinerary
      const prompt = `Create a detailed ${preferences.duration}-day itinerary for ${preferences.destination}:

USER CONTEXT:
- Budget: $${preferences.budget}
- Interests: ${userSettings.travel_interests?.join(', ') || 'varied'}
- Travel dates: ${preferences.start_date} to ${preferences.end_date}
- Travelers: ${preferences.travelers || 1} person(s)
- Dietary: ${userSettings.dietary_preferences?.join(', ') || 'none'}

Generate a comprehensive itinerary with:
1. Flight options (realistic routes, times, estimated prices)
2. Accommodation recommendations (3 options at different price points)
3. Daily activities with timing and costs
4. Restaurant recommendations for each day
5. Transportation between locations
6. Total estimated cost breakdown

Make it realistic and bookable. Use real knowledge of the destination.`;

      const { data } = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            flights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  airline: { type: "string" },
                  departure: { type: "string" },
                  arrival: { type: "string" },
                  duration: { type: "string" },
                  price: { type: "number" },
                  booking_url: { type: "string" }
                }
              }
            },
            accommodations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                  location: { type: "string" },
                  price_per_night: { type: "number" },
                  total_cost: { type: "number" },
                  amenities: { type: "array", items: { type: "string" } },
                  rating: { type: "number" },
                  booking_url: { type: "string" }
                }
              }
            },
            daily_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  date: { type: "string" },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        cost: { type: "number" },
                        booking_required: { type: "boolean" },
                        booking_url: { type: "string" }
                      }
                    }
                  },
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time: { type: "string" },
                        restaurant: { type: "string" },
                        cuisine: { type: "string" },
                        estimated_cost: { type: "number" }
                      }
                    }
                  }
                }
              }
            },
            cost_summary: {
              type: "object",
              properties: {
                flights: { type: "number" },
                accommodation: { type: "number" },
                activities: { type: "number" },
                meals: { type: "number" },
                transport: { type: "number" },
                total: { type: "number" }
              }
            }
          }
        }
      });

      return Response.json(data);
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
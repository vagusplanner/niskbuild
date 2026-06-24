import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    // Fetch user context
    const settings = await base44.entities.UserSettings.list();
    const pastHolidays = await base44.entities.Holiday.list('-start_date', 30);
    const userSettings = settings[0] || {};

    if (action === 'suggest_activities') {
      const { destination, interests, duration_days, budget } = params;

      const activities = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a local expert for ${destination}. Recommend personalized activities and experiences.

USER PROFILE:
- Interests: ${interests?.join(', ') || userSettings.travel_interests?.join(', ') || 'General'}
- Dietary: ${userSettings.dietary_preferences?.join(', ') || 'None'}
- Budget Level: ${budget > 3000 ? 'High' : budget > 1500 ? 'Medium' : 'Budget'}
- Trip Duration: ${duration_days} days

PAST TRAVEL PATTERNS:
${pastHolidays.slice(0, 5).map(h => `- ${h.destination}: ${h.notes || 'No notes'}`).join('\n')}

Generate 15-20 diverse activity recommendations for ${destination}, including:
1. Must-see landmarks and cultural sites
2. Unique local experiences (not touristy)
3. Food & dining experiences matching dietary needs
4. Adventure activities if user shows interest
5. Hidden gems locals love
6. Day trips from the city
7. Shopping experiences
8. Nightlife/entertainment
9. Relaxation spots
10. Instagram-worthy locations

For EACH activity provide:
- Exact name and location
- Why it matches their profile
- Best time to visit (time of day/season)
- Estimated cost and duration
- Booking requirements
- Insider tips
- Nearby activities to combine`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            activities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                  location: { type: 'string' },
                  why_recommended: { type: 'string' },
                  best_time: { type: 'string' },
                  cost: { type: 'number' },
                  duration_hours: { type: 'number' },
                  booking_required: { type: 'boolean' },
                  booking_url: { type: 'string' },
                  insider_tips: { type: 'array', items: { type: 'string' } },
                  nearby_activities: { type: 'array', items: { type: 'string' } },
                  best_for: { type: 'array', items: { type: 'string' } },
                  rating: { type: 'number' },
                  popularity: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json({ success: true, activities: activities.activities });
    }

    if (action === 'suggest_accommodations') {
      const { destination, budget_per_night, duration_nights, preferences } = params;

      const accommodations = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the best accommodations in ${destination} for this traveler.

USER PROFILE:
- Budget per night: $${budget_per_night}
- Duration: ${duration_nights} nights
- Travel Interests: ${userSettings.travel_interests?.join(', ') || 'General'}
- Travel Style: ${userSettings.work_style || 'Balanced'}
- Preferences: ${preferences || 'None specified'}

PAST ACCOMMODATION PATTERNS:
${pastHolidays.filter(h => h.accommodation).slice(0, 5).map(h => 
  `- ${h.destination}: ${h.accommodation}`
).join('\n') || 'No history'}

Suggest 8-10 accommodation options across different categories:
1. Best value for money
2. Luxury/premium options
3. Boutique/unique stays
4. Budget-friendly
5. Best location for sightseeing
6. Local neighborhood gems
7. Best for solo travelers / couples / families

For each accommodation:
- Use REAL establishments with current data
- Check availability patterns
- Include exact pricing
- Highlight unique features
- Explain location advantages
- Note any special offers`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            accommodations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  location: { type: 'string' },
                  neighborhood: { type: 'string' },
                  price_per_night: { type: 'number' },
                  total_cost: { type: 'number' },
                  rating: { type: 'number' },
                  review_count: { type: 'number' },
                  amenities: { type: 'array', items: { type: 'string' } },
                  unique_features: { type: 'array', items: { type: 'string' } },
                  why_recommended: { type: 'string' },
                  location_score: { type: 'number' },
                  distance_to_center: { type: 'string' },
                  nearby_attractions: { type: 'array', items: { type: 'string' } },
                  booking_url: { type: 'string' },
                  cancellation_policy: { type: 'string' },
                  best_for: { type: 'array', items: { type: 'string' } },
                  special_offers: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json({ success: true, accommodations: accommodations.accommodations });
    }

    if (action === 'real_time_updates') {
      const { destination, start_date, flight_number, hotel_name } = params;

      const updates = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide comprehensive real-time travel intelligence for ${destination}.

TRIP DETAILS:
- Destination: ${destination}
- Travel Date: ${start_date}
${flight_number ? `- Flight: ${flight_number}` : ''}
${hotel_name ? `- Hotel: ${hotel_name}` : ''}

Gather current information on:
1. Flight status (delays, cancellations, gate changes)
2. Current weather and 7-day forecast
3. Travel advisories or warnings (safety, health, political)
4. Local events happening during the stay
5. Airport conditions and wait times
6. Transportation strikes or disruptions
7. Hotel/area specific issues
8. Currency exchange rates and trends
9. Local COVID/health requirements
10. Protests, festivals, or crowd situations
11. Natural disasters or weather emergencies
12. Peak tourist season impacts

Provide only CURRENT, ACTIONABLE information with sources.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            flight_status: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                delay_minutes: { type: 'number' },
                gate: { type: 'string' },
                terminal: { type: 'string' },
                updated_at: { type: 'string' }
              }
            },
            weather: {
              type: 'object',
              properties: {
                current: { type: 'string' },
                forecast_7day: { type: 'array', items: { type: 'object' } },
                alerts: { type: 'array', items: { type: 'string' } }
              }
            },
            travel_advisories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  message: { type: 'string' },
                  source: { type: 'string' },
                  issued_at: { type: 'string' }
                }
              }
            },
            local_events: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  date: { type: 'string' },
                  description: { type: 'string' },
                  impact: { type: 'string' }
                }
              }
            },
            transportation_alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  message: { type: 'string' },
                  affected_areas: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            safety_score: { type: 'number' },
            currency_rate: { type: 'number' },
            health_requirements: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      return Response.json({ success: true, updates });
    }

    if (action === 'optimize_itinerary') {
      const { destination, activities, duration_days, start_date } = params;

      const optimized = await base44.integrations.Core.InvokeLLM({
        prompt: `Create an optimized ${duration_days}-day itinerary for ${destination}.

SELECTED ACTIVITIES:
${activities.map((a, i) => `${i + 1}. ${a.name} (${a.duration_hours}h, $${a.cost})`).join('\n')}

START DATE: ${start_date}

Optimize for:
1. Geographic proximity (minimize travel time)
2. Opening hours and best visiting times
3. Energy levels (intense activities early, relaxation later)
4. Weather patterns
5. Crowd avoidance (visit popular spots at off-peak times)
6. Meal times at nearby restaurants
7. Logical flow (e.g., museums near each other)
8. Buffer time for rest and spontaneity
9. Sunrise/sunset timing for scenic activities
10. Day-of-week considerations (weekend vs weekday)

Include:
- Exact timing for each activity
- Travel routes between locations
- Meal recommendations
- Rest periods
- Backup plans for weather
- Evening activities`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            daily_schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'number' },
                  date: { type: 'string' },
                  theme: { type: 'string' },
                  schedule: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        time: { type: 'string' },
                        activity: { type: 'string' },
                        duration: { type: 'string' },
                        location: { type: 'string' },
                        notes: { type: 'string' },
                        travel_to_next: { type: 'string' },
                        cost: { type: 'number' }
                      }
                    }
                  },
                  total_cost: { type: 'number' },
                  total_walking: { type: 'string' },
                  energy_level: { type: 'string' },
                  backup_plan: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json({ success: true, itinerary: optimized.daily_schedule });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
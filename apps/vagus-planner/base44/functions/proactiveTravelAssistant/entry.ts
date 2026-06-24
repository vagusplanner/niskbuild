import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get upcoming holidays/trips (next 90 days)
    const holidays = await base44.entities.Holiday.filter({
      created_by: user.email
    });

    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const upcomingTrips = holidays.filter(h => {
      const startDate = new Date(h.start_date);
      return startDate >= now && startDate <= ninetyDaysFromNow && h.status !== 'cancelled';
    });

    if (upcomingTrips.length === 0) {
      return Response.json({
        success: true,
        alerts: [],
        message: 'No upcoming trips found'
      });
    }

    // Generate proactive insights for each trip
    const alerts = [];

    for (const trip of upcomingTrips) {
      const startDate = new Date(trip.start_date);
      const daysUntilTrip = Math.floor((startDate - now) / (1000 * 60 * 60 * 24));

      // Use AI to generate comprehensive travel insights
      const aiInsights = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a proactive travel assistant. Analyze this upcoming trip and provide actionable alerts and recommendations.

**Trip Details:**
- Destination: ${trip.destination}
- Dates: ${trip.start_date} to ${trip.end_date}
- Days until departure: ${daysUntilTrip}
- Budget: $${trip.budget || 'Not set'}
- Cities: ${trip.cities?.map(c => `${c.city}, ${c.country}`).join('; ') || 'Not specified'}

**Current Information:**
- Visa requirements: ${trip.visa_requirements ? JSON.stringify(trip.visa_requirements) : 'Not checked'}
- Accommodation: ${trip.accommodation || 'Not booked'}
- Flight details: ${trip.flight_details || 'Not booked'}

Based on this information, provide:
1. **Flight Price Alerts**: Estimated price trends and booking recommendations (use current date: ${now.toISOString()})
2. **Hotel Recommendations**: Budget-appropriate suggestions and booking urgency
3. **Visa Reminders**: Processing time requirements and urgent actions needed
4. **Travel Advisories**: Current safety info, weather warnings, local events
5. **Packing Reminders**: When to start packing, essential items for destination
6. **Financial Tips**: Currency exchange, budget alerts, cost-saving opportunities
7. **Health Requirements**: Vaccinations, medications, health insurance needs

Provide specific, time-sensitive, actionable alerts. Use real-world knowledge about the destination.`,
        response_json_schema: {
          type: "object",
          properties: {
            flight_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  action: { type: "string" }
                }
              }
            },
            hotel_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  action: { type: "string" }
                }
              }
            },
            visa_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  action: { type: "string" },
                  deadline: { type: "string" }
                }
              }
            },
            travel_advisories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  source: { type: "string" }
                }
              }
            },
            packing_reminders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  due_date: { type: "string" }
                }
              }
            },
            financial_tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  potential_savings: { type: "number" }
                }
              }
            },
            health_requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  deadline: { type: "string" }
                }
              }
            }
          }
        }
      });

      alerts.push({
        trip_id: trip.id,
        trip_title: trip.title,
        destination: trip.destination,
        start_date: trip.start_date,
        days_until_trip: daysUntilTrip,
        insights: aiInsights,
        last_checked: now.toISOString()
      });

      // Update trip with latest travel alerts
      if (aiInsights.travel_advisories && aiInsights.travel_advisories.length > 0) {
        await base44.entities.Holiday.update(trip.id, {
          travel_alerts: aiInsights.travel_advisories.map(adv => ({
            type: adv.type,
            message: adv.message,
            timestamp: now.toISOString(),
            severity: adv.priority
          }))
        });
      }
    }

    console.log('Proactive travel assistant:', {
      user: user.email,
      trips_analyzed: upcomingTrips.length,
      total_alerts: alerts.reduce((sum, a) => 
        sum + 
        (a.insights.flight_alerts?.length || 0) +
        (a.insights.hotel_alerts?.length || 0) +
        (a.insights.visa_alerts?.length || 0) +
        (a.insights.travel_advisories?.length || 0), 
      0)
    });

    return Response.json({
      success: true,
      alerts,
      trips_analyzed: upcomingTrips.length
    });

  } catch (error) {
    console.error('Proactive travel assistant error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to generate travel alerts'
    }, { status: 500 });
  }
});
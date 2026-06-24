import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      request, 
      participants = [], 
      duration_minutes = 60,
      preferred_time_range,
      priority = 'medium'
    } = await req.json();

    // Fetch user's events, settings, and tasks
    const [events, settings, tasks] = await Promise.all([
      base44.entities.Event.list(),
      base44.entities.UserSettings.list(),
      base44.entities.Task.list()
    ]);

    const userSettings = settings[0] || {};

    // Parse natural language request
    const parseResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an intelligent calendar assistant. Parse this scheduling request and extract structured data:

Request: "${request}"

Extract and return:
- title: event title
- description: event description
- duration_minutes: estimated duration (default 60)
- category: work, personal, health, prayer, holiday, family, social, or other
- priority: low, medium, high, or urgent
- preferred_times: array of preferred time descriptions (e.g., "morning", "afternoon", "after 2pm")
- participants: array of email addresses mentioned
- location: any location mentioned
- is_recurring: boolean
- recurrence_pattern: if recurring, describe pattern

Current date context: ${new Date().toISOString()}`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          duration_minutes: { type: "number" },
          category: { type: "string" },
          priority: { type: "string" },
          preferred_times: { type: "array", items: { type: "string" } },
          participants: { type: "array", items: { type: "string" } },
          location: { type: "string" },
          is_recurring: { type: "boolean" },
          recurrence_pattern: { type: "string" }
        }
      }
    });

    const parsedData = parseResponse;

    // Analyze availability
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Build availability context
    const availabilityContext = {
      existing_events: events.filter(e => new Date(e.start_date) > now),
      working_hours: {
        enabled: userSettings.working_hours_enabled || false,
        start: userSettings.working_hours_start || '09:00',
        end: userSettings.working_hours_end || '17:00',
        days: userSettings.working_days || [1, 2, 3, 4, 5]
      },
      prayer_times_enabled: userSettings.prayer_enabled || false,
      high_priority_tasks: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent'),
      timezone: userSettings.timezone || 'UTC'
    };

    // Find optimal time slots
    const optimalSlotsResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an intelligent scheduling AI. Find the best 5 time slots for this event:

Event Details:
- Title: ${parsedData.title}
- Duration: ${parsedData.duration_minutes || duration_minutes} minutes
- Priority: ${parsedData.priority || priority}
- Category: ${parsedData.category}
- Preferred Times: ${parsedData.preferred_times?.join(', ') || 'flexible'}

User Context:
- Working Hours: ${availabilityContext.working_hours.enabled ? 
  `${availabilityContext.working_hours.start} to ${availabilityContext.working_hours.end}` : 'Not set'}
- Working Days: ${availabilityContext.working_hours.days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
- Prayer Times Enabled: ${availabilityContext.prayer_times_enabled}
- High Priority Tasks: ${availabilityContext.high_priority_tasks.length} pending

Existing Events (next 2 weeks): ${JSON.stringify(availabilityContext.existing_events.slice(0, 10).map(e => ({
  title: e.title,
  start: e.start_date,
  end: e.end_date,
  category: e.category
})))}

Rules:
1. Avoid conflicts with existing events
2. Respect working hours if set
3. Consider user's prayer times (leave 30-min gaps around typical prayer times if enabled)
4. Balance around high-priority tasks
5. Prefer mornings for high-priority work events
6. Prefer afternoons for meetings and social events
7. Give buffer time between back-to-back meetings (15 minutes)

Current time: ${now.toISOString()}
Search range: Next 14 days

Return 5 optimal time slots ranked by suitability.`,
      response_json_schema: {
        type: "object",
        properties: {
          optimal_slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start_date: { type: "string" },
                end_date: { type: "string" },
                score: { type: "number" },
                reasoning: { type: "string" }
              }
            }
          },
          suggestions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // If participants are involved, check their availability
    let participantAvailability = null;
    if (participants.length > 0) {
      // In a real implementation, this would check shared calendars
      participantAvailability = await base44.integrations.Core.InvokeLLM({
        prompt: `Suggest meeting times for ${participants.length} participants considering:
- Typical business hours across time zones
- Mid-morning (10am-11am) or mid-afternoon (2pm-3pm) preferred for meetings
- Avoid Monday mornings and Friday afternoons

Provide 3 best time slots for a ${parsedData.duration_minutes || duration_minutes}-minute meeting.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start_date: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });
    }

    return Response.json({
      parsed_event: parsedData,
      optimal_slots: optimalSlotsResponse.optimal_slots,
      suggestions: optimalSlotsResponse.suggestions,
      participant_recommendations: participantAvailability?.recommended_slots || [],
      availability_analysis: {
        total_events_next_2_weeks: availabilityContext.existing_events.length,
        high_priority_tasks: availabilityContext.high_priority_tasks.length,
        working_hours_configured: availabilityContext.working_hours.enabled
      }
    });

  } catch (error) {
    console.error('Intelligent scheduling error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to analyze scheduling request'
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date_range_start, date_range_end } = await req.json();

    // Fetch user's existing events and habits
    const [events, settings, prayerLogs] = await Promise.all([
      base44.entities.Event.list(),
      base44.entities.UserSettings.list(),
      base44.entities.PrayerLog ? base44.entities.PrayerLog.list() : []
    ]);

    // Analyze patterns
    const eventsByDay = {};
    const eventsByHour = {};
    
    events.forEach(event => {
      const start = new Date(event.start_date);
      const dayOfWeek = start.getDay();
      const hour = start.getHours();
      
      eventsByDay[dayOfWeek] = (eventsByDay[dayOfWeek] || 0) + 1;
      eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
    });

    // Find busy times
    const busyTimes = events
      .filter(e => new Date(e.start_date) >= new Date(date_range_start) && new Date(e.start_date) <= new Date(date_range_end))
      .map(e => ({
        start: e.start_date,
        end: e.end_date,
        title: e.title
      }));

    // Use AI for intelligent suggestions
    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an intelligent calendar assistant. Analyze the user's schedule and provide proactive scheduling suggestions.

Current Schedule Summary:
- Total events: ${events.length}
- Events by day: ${JSON.stringify(eventsByDay)}
- Busy hours: ${JSON.stringify(eventsByHour)}
- Upcoming busy times: ${JSON.stringify(busyTimes.slice(0, 10))}

User Preferences:
- Work style: ${settings[0]?.work_style || 'flexible'}
- Focus areas: ${settings[0]?.focus_areas?.join(', ') || 'work, personal'}

Provide 3-5 actionable scheduling suggestions considering:
1. Optimal times for focused work based on their patterns
2. Gaps in schedule for breaks or self-care
3. Time for prayer if they're Muslim
4. Balance between work and personal time
5. Avoiding over-scheduling

For each suggestion, include:
- A specific time slot recommendation
- The type of activity to schedule
- Why this time is optimal
- Priority level`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time_slot: { type: "string" },
                activity_type: { type: "string" },
                title: { type: "string" },
                reasoning: { type: "string" },
                priority: { 
                  type: "string",
                  enum: ["low", "medium", "high"]
                }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggestions: suggestions.suggestions
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
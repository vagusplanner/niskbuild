import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period, start_date, end_date } = await req.json(); // period: 'daily' or 'weekly'

    // Fetch events in the date range
    const events = await base44.entities.Event.list();
    const filteredEvents = events.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate >= new Date(start_date) && eventDate <= new Date(end_date);
    });

    // Group by category and priority
    const byCategory = {};
    const byPriority = { high: [], medium: [], low: [] };
    
    filteredEvents.forEach(event => {
      const category = event.category || 'other';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(event);
      
      const priority = event.priority || 'medium';
      if (byPriority[priority]) byPriority[priority].push(event);
    });

    // Use AI to generate intelligent summary
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a concise ${period} calendar summary for the user.

Period: ${period === 'daily' ? 'Today' : 'This Week'}
Total events: ${filteredEvents.length}
High priority: ${byPriority.high.length}

Key Events:
${filteredEvents.slice(0, 10).map(e => `- ${e.title} (${e.category}) at ${new Date(e.start_date).toLocaleString()}`).join('\n')}

Generate a summary that includes:
1. Overview - one clear sentence about what's happening (NO weekday ranges like "Monday to Friday", just describe the schedule intensity)
2. Key events list (up to 3 most important)
3. Workload assessment
4. Brief actionable advice

Be concise and avoid redundant information like date ranges or weekday lists.`,
      response_json_schema: {
        type: "object",
        properties: {
          overview: { type: "string" },
          key_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                time: { type: "string" },
                importance: { type: "string" }
              }
            }
          },
          workload: { 
            type: "string",
            enum: ["light", "moderate", "busy", "very_busy"]
          },
          advice: { type: "string" },
          statistics: {
            type: "object",
            properties: {
              total_events: { type: "number" },
              high_priority: { type: "number" },
              categories: { type: "object" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      period,
      date_range: { start: start_date, end: end_date },
      summary: summary
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
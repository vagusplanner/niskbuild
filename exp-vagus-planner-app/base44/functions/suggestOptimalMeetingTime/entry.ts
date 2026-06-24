import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_title, attendee_emails, duration_minutes, preferred_date_range, priority } = await req.json();

    if (!attendee_emails || attendee_emails.length === 0) {
      return Response.json({ error: 'attendee_emails required' }, { status: 400 });
    }

    const durationMins = duration_minutes || 30;
    const meetingPriority = priority || 'medium';

    // Get events for all attendees in the date range
    const startDate = preferred_date_range?.start || new Date().toISOString();
    const endDate = preferred_date_range?.end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const allEvents = await base44.entities.Event.filter({
      start_date: { $gte: startDate, $lte: endDate }
    });

    // Get user settings for work hours and preferences
    const allSettings = await base44.entities.UserSettings.list();
    const attendeeSettings = allSettings.filter(s => attendee_emails.includes(s.created_by));

    // Analyze availability and patterns
    const context = {
      meeting_title,
      duration_minutes: durationMins,
      priority: meetingPriority,
      attendee_count: attendee_emails.length,
      date_range: { start: startDate, end: endDate },
      attendee_schedules: attendee_emails.map(email => {
        const userEvents = allEvents.filter(e => e.created_by === email);
        const settings = attendeeSettings.find(s => s.created_by === email);
        return {
          email,
          event_count: userEvents.length,
          busy_slots: userEvents.map(e => ({
            start: e.start_date,
            end: e.end_date,
            category: e.category
          })),
          work_style: settings?.work_style || 'flexible',
          prayer_enabled: settings?.prayer_enabled || false,
          typical_work_hours: getWorkHours(settings)
        };
      })
    };

    // Ask AI to suggest optimal times
    const prompt = `You are a meeting scheduling expert. Analyze the schedules and suggest the 5 best time slots for this meeting:

Meeting Details:
- Title: ${meeting_title || 'Meeting'}
- Duration: ${durationMins} minutes
- Priority: ${meetingPriority}
- Attendees: ${attendee_emails.length}
- Date Range: ${new Date(startDate).toDateString()} - ${new Date(endDate).toDateString()}

Attendee Schedules:
${JSON.stringify(context.attendee_schedules, null, 2)}

Consider:
1. Avoid existing busy slots for ALL attendees
2. Respect typical work hours and work styles (early-bird prefers mornings, night-owl prefers afternoons)
3. Avoid prayer times if enabled (typically 5:00, 12:30, 15:30, 18:00, 20:00)
4. High priority meetings should get prime time slots (10am-2pm)
5. Leave buffer time between back-to-back meetings
6. Consider typical meeting fatigue (avoid late Friday, early Monday)

Suggest 5 optimal time slots with reasoning.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD" },
                start_time: { type: "string", description: "HH:MM" },
                end_time: { type: "string", description: "HH:MM" },
                score: { type: "number", description: "Quality score 1-10" },
                reasoning: { type: "string" },
                attendee_conflicts: { type: "array", items: { type: "string" } }
              }
            }
          },
          analysis: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      optimal_slots: response.suggested_slots || [],
      analysis: response.analysis,
      recommendations: response.recommendations,
      context_analyzed: {
        total_events_checked: allEvents.length,
        attendees_analyzed: attendee_emails.length
      }
    });

  } catch (error) {
    console.error('Error suggesting meeting time:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getWorkHours(settings) {
  if (!settings) return { start: "09:00", end: "17:00" };
  
  const workStyle = settings.work_style;
  if (workStyle === 'early-bird') return { start: "07:00", end: "15:00" };
  if (workStyle === 'night-owl') return { start: "11:00", end: "19:00" };
  return { start: "09:00", end: "17:00" };
}
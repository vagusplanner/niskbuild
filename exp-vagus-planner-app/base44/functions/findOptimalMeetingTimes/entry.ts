import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { participants, duration, dateRange = 7, preferredTimeRanges } = await req.json();

    if (!participants || participants.length === 0) {
      return Response.json({ error: 'Participants required' }, { status: 400 });
    }

    // Fetch all events for participants in the date range
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dateRange);

    const allEvents = await base44.asServiceRole.entities.Event.list('-start_date', 500);
    const relevantEvents = allEvents.filter(event => {
      const eventDate = new Date(event.start_date);
      return participants.includes(event.created_by) && 
             eventDate >= new Date() && 
             eventDate <= endDate;
    });

    // Fetch user settings for each participant (timezone, working hours)
    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const participantSettings = {};
    
    for (const email of participants) {
      const settings = allSettings.find(s => s.created_by === email) || {};
      participantSettings[email] = {
        timezone: settings.timezone || 'UTC',
        work_style: settings.work_style || 'flexible',
        do_not_disturb: settings.do_not_disturb || false,
        dnd_start_time: settings.dnd_start_time || '22:00',
        dnd_end_time: settings.dnd_end_time || '07:00'
      };
    }

    // Build availability map
    const availabilityMap = {};
    for (const email of participants) {
      const userEvents = relevantEvents.filter(e => e.created_by === email);
      availabilityMap[email] = userEvents.map(e => ({
        start: e.start_date,
        end: e.end_date,
        title: e.title
      }));
    }

    const prompt = `You are an advanced AI meeting scheduler. Analyze calendars and suggest optimal meeting times.

MEETING DETAILS:
- Duration: ${duration} minutes
- Date range: Next ${dateRange} days
- Participants: ${participants.length}

PARTICIPANT SCHEDULES & PREFERENCES:
${participants.map(email => `
${email}:
  Timezone: ${participantSettings[email]?.timezone || 'Unknown'}
  Work Style: ${participantSettings[email]?.work_style || 'flexible'}
  Do Not Disturb: ${participantSettings[email]?.dnd_start_time} - ${participantSettings[email]?.dnd_end_time}
  
  Existing commitments:
  ${availabilityMap[email]?.slice(0, 20).map(e => `    - ${new Date(e.start).toISOString()}: ${e.title}`).join('\n') || '    No events'}
`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Find 5 optimal time slots when ALL participants are free
2. Consider timezone differences - convert to ISO format
3. Respect working hours based on work_style:
   - early-bird: 7am-3pm
   - night-owl: 11am-7pm
   - flexible: 9am-6pm
4. Avoid do-not-disturb hours
5. Prefer mid-week days (Tue-Thu)
6. Leave 30min buffer between existing meetings
7. Score each slot 0-10 based on:
   - How many participants it works for
   - Time zone convenience (minimize odd hours for anyone)
   - Energy levels (morning vs afternoon)
   - Existing meeting density

Return times in ISO 8601 format with timezone info.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          optimal_slots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start: { type: "string" },
                end: { type: "string" },
                score: { type: "number" },
                reasoning: { type: "string" },
                timezone_details: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      participant: { type: "string" },
                      local_time: { type: "string" },
                      is_working_hours: { type: "boolean" }
                    }
                  }
                },
                conflicts: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          analysis_summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error finding optimal times:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
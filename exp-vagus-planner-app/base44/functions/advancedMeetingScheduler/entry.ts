import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { constraints, attendeeEmails = [], duration = 60 } = await req.json();

    // Get Google Calendar access token
    const calendarToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch user's existing events
    const userEvents = await base44.entities.Event.filter({
      created_by: user.email
    });

    // Fetch team availability from Google Calendar
    const teamAvailability = [];
    
    for (const attendeeEmail of attendeeEmails) {
      try {
        const calendarId = encodeURIComponent(attendeeEmail);
        const timeMin = new Date().toISOString();
        const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 2 weeks ahead
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
          {
            headers: { Authorization: `Bearer ${calendarToken}` }
          }
        );

        if (response.ok) {
          const data = await response.json();
          teamAvailability.push({
            email: attendeeEmail,
            events: data.items || []
          });
        }
      } catch (error) {
        console.log(`Could not fetch calendar for ${attendeeEmail}:`, error.message);
      }
    }

    // Use AI to analyze constraints and find optimal times
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an advanced meeting scheduling assistant. Analyze the user's constraints and existing calendar data to suggest optimal meeting times.

**User Constraints:**
${constraints}

**Meeting Details:**
- Duration: ${duration} minutes
- Attendees: ${attendeeEmails.join(', ')}

**User's Existing Events (next 14 days):**
${userEvents.slice(0, 20).map(e => `- ${e.title}: ${e.start_date} to ${e.end_date}`).join('\n')}

**Team Availability Data:**
${teamAvailability.map(ta => `
${ta.email}: ${ta.events.length} scheduled events
${ta.events.slice(0, 5).map(e => `  - ${e.summary}: ${e.start?.dateTime || e.start?.date} to ${e.end?.dateTime || e.end?.date}`).join('\n')}
`).join('\n')}

Based on this data:
1. Parse and understand the user's constraints (time windows, days to avoid, notice periods, preferences)
2. Find 5 optimal time slots that satisfy all constraints
3. Consider team patterns (e.g., avoid back-to-back meetings, prefer certain times)
4. Ensure no conflicts with existing events
5. Rank suggestions by quality (prefer morning slots, avoid Friday afternoons, etc.)

For each suggestion, provide:
- Start datetime (ISO format)
- End datetime (ISO format)
- Quality score (1-10)
- Reasoning for why this time is good
- Any caveats or concerns`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                start_time: { type: "string" },
                end_time: { type: "string" },
                quality_score: { type: "number" },
                reasoning: { type: "string" },
                caveats: { type: "string" }
              }
            }
          },
          constraints_parsed: {
            type: "object",
            properties: {
              time_window_start: { type: "string" },
              time_window_end: { type: "string" },
              days_to_avoid: { type: "array", items: { type: "string" } },
              time_ranges_to_avoid: { type: "array", items: { type: "string" } },
              minimum_notice_days: { type: "number" },
              preferred_times: { type: "array", items: { type: "string" } }
            }
          },
          team_insights: {
            type: "object",
            properties: {
              busiest_member: { type: "string" },
              common_free_times: { type: "array", items: { type: "string" } },
              recommended_duration: { type: "number" }
            }
          }
        }
      }
    });

    console.log('Advanced scheduling complete:', {
      user: user.email,
      attendees: attendeeEmails.length,
      suggestions: aiResult.suggestions?.length || 0
    });

    return Response.json({
      success: true,
      suggestions: aiResult.suggestions || [],
      constraints_parsed: aiResult.constraints_parsed || {},
      team_insights: aiResult.team_insights || {},
      team_availability_fetched: teamAvailability.length
    });

  } catch (error) {
    console.error('Advanced meeting scheduler error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({
      error: error.message || 'Failed to schedule meeting'
    }, { status: 500 });
  }
});
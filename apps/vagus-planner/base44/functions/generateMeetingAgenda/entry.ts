import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_title, description, attendees, duration_minutes, context } = await req.json();

    if (!meeting_title) {
      return Response.json({ error: 'meeting_title required' }, { status: 400 });
    }

    const durationMins = duration_minutes || 30;

    // Get user's recent meetings and events for context
    const recentEvents = await base44.entities.Event.filter({
      created_by: user.email,
      category: 'work'
    });

    const recentMeetings = await base44.entities.Meeting.filter({
      organizer_email: user.email
    });

    // Build context
    const meetingContext = {
      title: meeting_title,
      description: description || '',
      duration_minutes: durationMins,
      attendee_count: attendees?.length || 0,
      user_email: user.email,
      recent_meeting_topics: recentMeetings.slice(0, 5).map(m => m.title),
      additional_context: context || ''
    };

    // Generate agenda with AI
    const prompt = `You are an expert meeting facilitator. Generate a professional, actionable agenda for this meeting:

Meeting Details:
- Title: ${meeting_title}
- Description: ${description || 'Not provided'}
- Duration: ${durationMins} minutes
- Attendees: ${attendees?.length || 'Not specified'}
${context ? `- Additional Context: ${context}` : ''}

Recent Meeting Topics (for context):
${meetingContext.recent_meeting_topics.join(', ')}

Create a structured agenda that:
1. Breaks down the meeting into time-boxed sections
2. Includes clear objectives for each section
3. Identifies key discussion points
4. Suggests preparation items for attendees
5. Proposes outcomes/deliverables

Keep it practical and actionable for a ${durationMins}-minute meeting.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          agenda_items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                duration_minutes: { type: "number" },
                objectives: { type: "array", items: { type: "string" } },
                talking_points: { type: "array", items: { type: "string" } }
              }
            }
          },
          preparation_items: {
            type: "array",
            items: { type: "string" }
          },
          expected_outcomes: {
            type: "array",
            items: { type: "string" }
          },
          suggested_roles: {
            type: "object",
            properties: {
              facilitator: { type: "string" },
              note_taker: { type: "string" },
              timekeeper: { type: "string" }
            }
          },
          tips: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      agenda: response.agenda_items || [],
      preparation: response.preparation_items || [],
      outcomes: response.expected_outcomes || [],
      roles: response.suggested_roles || {},
      tips: response.tips || []
    });

  } catch (error) {
    console.error('Error generating agenda:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
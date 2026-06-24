import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_id } = await req.json();

    // Fetch the meeting
    const meetings = await base44.entities.Meeting.filter({ id: meeting_id });
    const meeting = meetings[0];

    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Generate follow-up suggestions
    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `
Analyze this completed meeting and suggest follow-up actions:

Meeting: ${meeting.title}
Attendees: ${meeting.attendees?.join(', ') || 'Not specified'}
Outcome Notes: ${meeting.outcome_notes || 'No notes available'}
Summary: ${meeting.ai_summary || 'No summary available'}

Based on this meeting, suggest:
1. Immediate follow-up tasks to create
2. Follow-up meetings to schedule (with suggested topics)
3. Documents or emails to send
4. Action items to track
5. Next check-in date

Be specific and actionable.
      `,
      response_json_schema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                assigned_to: { type: 'string' },
                due_days: { type: 'number' },
                priority: { type: 'string' }
              }
            }
          },
          follow_up_meetings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                suggested_date: { type: 'string' },
                attendees: { type: 'array', items: { type: 'string' } },
                agenda_topics: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          documents_needed: {
            type: 'array',
            items: { type: 'string' }
          },
          next_check_in: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      meeting_id: meeting.id,
      suggestions: suggestions
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
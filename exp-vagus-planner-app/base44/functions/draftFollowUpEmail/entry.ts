import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meeting_title, attendees, key_decisions, action_items, follow_up_topics, overall_summary } = await req.json();

    // Draft a professional follow-up email
    const emailDraft = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional executive assistant drafting a follow-up email after a meeting.

Meeting: ${meeting_title}
Attendees: ${attendees?.join(', ') || 'Team'}

Summary: ${overall_summary || 'Meeting completed'}

Key Decisions:
${key_decisions?.map(d => `- ${d.decision} (${d.decided_by})`).join('\n') || 'None recorded'}

Action Items:
${action_items?.map(a => `- ${a.task} (Owner: ${a.owner}, Due: ${a.deadline})`).join('\n') || 'None recorded'}

Follow-up Topics:
${follow_up_topics?.map(t => `- ${t.topic}`).join('\n') || 'None identified'}

Draft a professional, concise follow-up email that:
1. Thanks attendees for their time
2. Summarizes key decisions made
3. Lists action items with clear owners and deadlines
4. Mentions any follow-up meetings or topics
5. Has a positive, collaborative tone

Keep it professional but friendly. Use clear formatting.

Return as JSON with subject and body.`,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { 
            type: 'string',
            description: 'Email subject line'
          },
          body: { 
            type: 'string',
            description: 'Email body with HTML formatting'
          },
          to: {
            type: 'array',
            items: { type: 'string' },
            description: 'Recipient email addresses'
          }
        }
      }
    });

    return Response.json({
      success: true,
      email: {
        ...emailDraft,
        to: attendees || [],
        from: user.email
      }
    });

  } catch (error) {
    console.error('Error drafting email:', error);
    return Response.json({ 
      error: error.message || 'Failed to draft email'
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conflicts } = await req.json();

    if (!conflicts || conflicts.length === 0) {
      return Response.json({ proposals: [] });
    }

    // Use LLM to generate reschedule proposals
    const conflictDescriptions = conflicts.map(c => 
      `Conflict: "${c.title1}" (${new Date(c.start1).toLocaleString()} - ${new Date(c.end1).toLocaleString()}) overlaps with "${c.title2}" (${new Date(c.start2).toLocaleString()} - ${new Date(c.end2).toLocaleString()})`
    ).join('\n');

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a smart calendar assistant. Analyze these meeting conflicts and suggest 2-3 optimal reschedule options for each conflict. Consider:
- Avoiding back-to-back meetings
- Respecting people's working hours (9am-5pm)
- Keeping meetings on their original days if possible
- Finding slots that work for all participants

Conflicts:
${conflictDescriptions}

For each conflict, provide a JSON array with objects containing:
- suggestion: brief description of the proposal (e.g., "Move meeting2 to 2:00 PM")
- newStart: ISO datetime for the meeting to move
- newEnd: ISO datetime for the meeting to move
- meetingId: the event id to reschedule

Return ONLY valid JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          proposals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                suggestion: { type: 'string' },
                newStart: { type: 'string' },
                newEnd: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json({
      proposals: response.proposals || []
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
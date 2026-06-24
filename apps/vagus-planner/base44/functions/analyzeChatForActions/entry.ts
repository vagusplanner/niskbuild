import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, event_title, messages } = await req.json();

    const conversationText = messages.map(m => 
      `${m.sender} (${m.timestamp}): ${m.text}`
    ).join('\n');

    const prompt = `Analyze this conversation about the event "${event_title}" and extract actionable items:

${conversationText}

Identify:
1. Follow-up meetings that need to be scheduled
2. Tasks/action items mentioned
3. Deadlines or due dates mentioned
4. People who should be invited/included

For each actionable item, provide:
- type: "meeting", "task", "deadline", or "invite"
- description: What needs to be done
- suggested_date: If a date/time was mentioned (ISO format or null)
- participants: Array of people mentioned (or empty array)
- priority: "low", "medium", or "high"

Return as JSON with a "suggestions" array.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                description: { type: 'string' },
                suggested_date: { type: 'string' },
                participants: { 
                  type: 'array',
                  items: { type: 'string' }
                },
                priority: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json(result);

  } catch (error) {
    console.error('Error analyzing chat:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
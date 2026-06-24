import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventTitle, eventDescription, attendees } = await req.json();
    
    // Use LLM to generate meeting prep materials
    const prompt = `You are a professional meeting assistant. Generate a concise meeting agenda and preparation briefing for:
    
Meeting: ${eventTitle}
Description: ${eventDescription || 'No description provided'}
Attendees: ${attendees?.join(', ') || 'Unknown'}

Provide:
1. Meeting Agenda (3-5 key points)
2. Preparation Briefing (what to review beforehand)
3. Discussion Topics
4. Expected Outcomes

Keep it concise and actionable.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          agenda: { type: 'string' },
          briefing: { type: 'string' },
          topics: { type: 'array', items: { type: 'string' } },
          outcomes: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
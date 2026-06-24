import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingNotes, meetingTitle } = await req.json();
    
    if (!meetingNotes) {
      return Response.json({ error: 'Meeting notes required' }, { status: 400 });
    }

    const prompt = `You are a professional meeting analyst. Analyze the following meeting notes and extract:

Meeting: ${meetingTitle || 'Untitled Meeting'}
Notes: ${meetingNotes}

Extract and provide in JSON format:
1. Action Items (with owner and deadline if mentioned)
2. Key Decisions Made
3. Follow-up Items
4. Risks/Issues Identified
5. Next Steps

Be specific and concise.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          actionItems: { 
            type: 'array', 
            items: { 
              type: 'object',
              properties: {
                task: { type: 'string' },
                owner: { type: 'string' },
                deadline: { type: 'string' }
              }
            }
          },
          decisions: { type: 'array', items: { type: 'string' } },
          followUps: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          nextSteps: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
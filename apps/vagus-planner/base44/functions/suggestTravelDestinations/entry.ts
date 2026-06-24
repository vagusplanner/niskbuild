import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { interests, budget, duration_days } = await req.json();

    // Use AI to suggest destinations
    const prompt = `Suggest 4 travel destinations for someone with these interests: ${interests.join(', ')}.
    
Trip details:
- Duration: ${duration_days} days
- Budget: ${budget ? `$${budget}` : 'Flexible'}

For each destination, provide:
1. Name (city, country)
2. Why it matches their interests (1 sentence)
3. Best time to visit
4. Budget level (budget/moderate/luxury)

Format as JSON array with fields: name, reason, best_time, budget_level`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          destinations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string' },
                best_time: { type: 'string' },
                budget_level: { type: 'string' }
              }
            }
          }
        }
      }
    });

    return Response.json(result);

  } catch (error) {
    console.error('Error suggesting destinations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
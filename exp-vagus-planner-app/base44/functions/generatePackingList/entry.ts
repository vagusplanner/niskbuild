import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, start_date, end_date, activities } = await req.json();

    const duration = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));

    // Get weather and context info
    const prompt = `Generate a comprehensive packing list for a ${duration}-day trip to ${destination} from ${start_date} to ${end_date}.

${activities && activities.length > 0 ? `Planned activities: ${activities.join(', ')}` : ''}

Include:
- Clothing (based on weather)
- Toiletries
- Electronics
- Documents
- Medications
- Islamic items (prayer mat, Quran, modest clothing if needed)
- Miscellaneous

For each item, provide:
- name: Item name
- category: One of (Clothing, Toiletries, Electronics, Documents, Medications, Islamic, Miscellaneous)
- quantity: Number needed (optional)
- essential: true/false

Return as JSON with an 'items' array.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                quantity: { type: 'number' },
                essential: { type: 'boolean' }
              }
            }
          }
        }
      }
    });

    return Response.json(result);

  } catch (error) {
    console.error('Error generating packing list:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
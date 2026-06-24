import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();

    // Use AI to parse natural language
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Parse this natural language event description into structured data:
"${text}"

Extract:
- title (required)
- date (convert relative dates like "tomorrow", "next Monday" to actual dates from today: ${new Date().toISOString()})
- start time (24h format)
- end time (24h format, estimate duration if not specified)
- location
- description/notes
- category (work, personal, health, prayer, holiday, family, social, other)

Return JSON only, no explanation.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          location: { type: "string" },
          description: { type: "string" },
          category: { type: "string" }
        },
        required: ["title", "date"]
      }
    });

    // Parse the response
    const parsed = response;
    
    // Construct ISO datetime strings
    const startDateTime = `${parsed.date}T${parsed.start_time || '09:00'}:00`;
    const endDateTime = `${parsed.date}T${parsed.end_time || '10:00'}:00`;

    return Response.json({
      success: true,
      event: {
        title: parsed.title,
        start_date: startDateTime,
        end_date: endDateTime,
        location: parsed.location || '',
        description: parsed.description || '',
        category: parsed.category || 'personal',
        is_all_day: !parsed.start_time && !parsed.end_time
      }
    });

  } catch (error) {
    console.error('Natural language parsing error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
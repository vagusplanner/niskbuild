import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, origin, nationality } = await req.json();

    // Get visa requirements using LLM with web search
    const visaInfo = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Get current visa requirements for travel:
From: ${origin}
To: ${destination}
Nationality: ${nationality || 'Not specified'}

Provide:
1. Is visa required? (yes/no)
2. Type of visa (tourist, visa-on-arrival, e-visa, etc.)
3. Processing time
4. Approximate cost
5. Required documents
6. Official application URL
7. Important notes or tips

Be accurate and up-to-date. Use official government sources.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          required: { type: "boolean" },
          type: { type: "string" },
          processing_time: { type: "string" },
          cost: { type: "string" },
          documents_needed: {
            type: "array",
            items: { type: "string" }
          },
          application_url: { type: "string" },
          notes: { type: "string" }
        }
      }
    });

    return Response.json({ visa_info: visaInfo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
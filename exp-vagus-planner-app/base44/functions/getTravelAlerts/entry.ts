import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destination, flight_number, departure_date } = await req.json();

    // Fetch real-time travel alerts using LLM with web search
    const alerts = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Get real-time travel information and alerts for:
Destination: ${destination}
${flight_number ? `Flight Number: ${flight_number}` : ''}
${departure_date ? `Departure Date: ${departure_date}` : ''}

Check for:
1. Flight status (delays, cancellations, gate changes)
2. Weather alerts at destination
3. Travel advisories or warnings
4. Airport delays or issues
5. Any recent incidents or safety concerns

Provide only current, actionable alerts. If no issues, return empty array.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { 
                  type: "string",
                  enum: ["flight_delay", "cancellation", "gate_change", "weather", "advisory", "security"]
                },
                message: { type: "string" },
                severity: { 
                  type: "string",
                  enum: ["info", "warning", "critical"]
                },
                timestamp: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ alerts: alerts.alerts || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
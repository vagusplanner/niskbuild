import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, amount, notes, receipt_url } = await req.json();

    // Use AI to categorize the expense
    const prompt = `Categorize this travel expense:

Title: ${title}
Amount: $${amount}
Notes: ${notes || 'N/A'}

Determine the most appropriate category from:
- flights: Airline tickets, flight bookings
- accommodation: Hotels, Airbnb, lodging
- food: Restaurants, groceries, dining
- activities: Tours, attractions, entertainment
- transport: Taxis, car rentals, public transport, fuel
- shopping: Souvenirs, retail purchases
- other: Miscellaneous expenses

Also suggest a better title if needed (keep it concise).`;

    const { data } = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["flights", "accommodation", "food", "activities", "transport", "shopping", "other"]
          },
          suggested_title: { type: "string" },
          confidence: { type: "string" }
        }
      }
    });

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { current_holiday, past_holidays, similar_destinations } = await req.json();

    const insights = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze holiday spending patterns and provide AI-powered budget insights:

CURRENT TRIP:
- Destination: ${current_holiday.destination}
- Budget: $${current_holiday.budget}
- Spent so far: $${current_holiday.spent}
- Days remaining: ${current_holiday.days_remaining}
- Spending by category: ${JSON.stringify(current_holiday.by_category)}

PAST TRIPS (for comparison):
${past_holidays.map(h => `- ${h.destination}: Budget $${h.total_budget}, Spent $${h.total_spent}, Categories: ${JSON.stringify(h.by_category)}`).join('\n')}

SIMILAR DESTINATIONS:
${similar_destinations.map(d => `- ${d.destination}: Budget $${d.budget}`).join('\n')}

Provide:
1. Spending trends: Compare current spending to past patterns. Are they overspending in any category?
2. Cost savings: Specific tips with estimated savings based on past data (e.g., "You spent 40% more on food than usual")
3. Recommendations: Smart suggestions for remaining days
4. Price comparison: How does their spending compare to similar trips and typical costs for this destination?

Be specific, actionable, and reference actual numbers from the data.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          spending_trends: { type: "string" },
          cost_savings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                tip: { type: "string" }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          price_comparison: { type: "string" }
        }
      }
    });

    return Response.json(insights);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
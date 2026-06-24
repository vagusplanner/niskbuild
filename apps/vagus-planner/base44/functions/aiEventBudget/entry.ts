import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_name, event_type, attendees, location, total_budget, venue_cost } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a detailed event budget breakdown with cost-saving tips. Format as JSON.

Event Details:
- Name: ${event_name}
- Type: ${event_type}
- Attendees: ${attendees}
- Location: ${location}
- Total Budget: ${total_budget}
- Venue Cost: ${venue_cost}

Provide comprehensive budgeting advice in this JSON format:
{
  "budget_breakdown": [
    {
      "category": "Category Name",
      "percentage_of_budget": number,
      "recommended_amount": "amount",
      "items": ["item1", "item2"],
      "typical_costs": {
        "budget_option": "cost range",
        "mid_range_option": "cost range",
        "premium_option": "cost range"
      }
    }
  ],
  "cost_saving_tips": [
    {
      "category": "category name",
      "tips": ["tip1", "tip2", "tip3"],
      "potential_savings": "estimated savings amount"
    }
  ],
  "vendor_negotiation_strategies": [
    {
      "vendor_type": "type",
      "negotiation_points": ["point1", "point2"],
      "typical_discount_range": "X-Y%"
    }
  ],
  "hidden_costs_to_watch": ["cost1", "cost2", "cost3"],
  "budget_summary": {
    "total_budget": "${total_budget}",
    "recommended_allocation": "breakdown summary",
    "contingency_percentage": "recommended %"
  }
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          budget_breakdown: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                percentage_of_budget: { type: 'number' },
                recommended_amount: { type: 'string' },
                items: { type: 'array', items: { type: 'string' } },
                typical_costs: { type: 'object' }
              }
            }
          },
          cost_saving_tips: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                tips: { type: 'array', items: { type: 'string' } },
                potential_savings: { type: 'string' }
              }
            }
          },
          vendor_negotiation_strategies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                vendor_type: { type: 'string' },
                negotiation_points: { type: 'array', items: { type: 'string' } },
                typical_discount_range: { type: 'string' }
              }
            }
          },
          hidden_costs_to_watch: { type: 'array', items: { type: 'string' } },
          budget_summary: { type: 'object' }
        }
      }
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
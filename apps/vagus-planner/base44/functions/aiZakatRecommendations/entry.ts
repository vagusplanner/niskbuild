import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latest_calculation, previous_donations, user_goals } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide Zakat recommendations for a Muslim based on their financial situation:

Latest Zakat Calculation:
- Total zakatable wealth: $${latest_calculation?.total_zakatable_wealth || 0}
- Zakat due: $${latest_calculation?.zakat_due || 0}
- Payment status: ${latest_calculation?.status || 'Not calculated'}
- Amount already paid: $${latest_calculation?.amount_paid || 0}

Previous Donations (Last Year):
${previous_donations?.length > 0 ? previous_donations.map(d => `- ${d.type}: $${d.amount} to ${d.category}`).join('\n') : 'No recorded donations'}

User Goals & Interests:
${user_goals?.map(g => `- ${g.goal_type}: ${g.goal_description}`).join('\n') || 'None specified'}

Generate personalized Zakat recommendations in JSON:
{
  "zakat_status": {
    "is_obligatory": true/false,
    "amount_due": number,
    "amount_remaining": number,
    "nisab_met": true/false
  },
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Why this matters",
      "amount_suggested": number,
      "category": "mosque|orphans|poor|education|healthcare|disaster_relief|general",
      "urgency": "immediate|this_month|this_quarter",
      "islamic_context": "Brief Islamic principle"
    }
  ],
  "payment_plan": {
    "suggested_frequency": "lump_sum|monthly|quarterly",
    "monthly_amount": number,
    "next_due_date": "YYYY-MM-DD"
  },
  "wisdom": "1-2 sentence Quranic or Hadith reference about charity"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          zakat_status: {
            type: 'object',
            properties: {
              is_obligatory: { type: 'boolean' },
              amount_due: { type: 'number' },
              amount_remaining: { type: 'number' },
              nisab_met: { type: 'boolean' }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                amount_suggested: { type: 'number' },
                category: { type: 'string' },
                urgency: { type: 'string' },
                islamic_context: { type: 'string' }
              }
            }
          },
          payment_plan: {
            type: 'object',
            properties: {
              suggested_frequency: { type: 'string' },
              monthly_amount: { type: 'number' },
              next_due_date: { type: 'string' }
            }
          },
          wisdom: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      data: response
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { charitable_giving, zakat_calculations, time_period = 'year' } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive charity report summarizing giving activity:

Charitable Giving Records (${time_period}):
${charitable_giving?.map(g => `- ${g.type} (${g.category}): $${g.amount} on ${g.date}`).join('\n') || 'No records'}

Zakat Calculations:
${zakat_calculations?.map(z => `- Year ${z.year}: $${z.zakat_due} due, $${z.amount_paid} paid`).join('\n') || 'No records'}

Generate a personalized charity report in JSON with insights and recommendations:
{
  "summary": {
    "total_given": number,
    "total_zakat": number,
    "total_sadaqah": number,
    "period": "${time_period}",
    "num_donations": number
  },
  "breakdown": {
    "by_type": {
      "zakat": number,
      "sadaqah": number,
      "other": number
    },
    "by_category": {
      "category_name": { "amount": number, "percentage": number }
    }
  },
  "insights": [
    {
      "title": "Insight title",
      "finding": "What the data shows",
      "significance": "Why this matters spiritually/socially"
    }
  ],
  "trends": {
    "consistency": "Pattern of giving",
    "growth": "Year-over-year or month-over-month trend",
    "impact": "Estimated number of people helped based on giving"
  },
  "recommendations": [
    {
      "area": "Category or type",
      "suggestion": "What to focus on",
      "rationale": "Why this is important"
    }
  ],
  "Islamic_reflection": "Encouraging reflection on charity and its spiritual rewards",
  "certificate_eligible": true/false
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              total_given: { type: 'number' },
              total_zakat: { type: 'number' },
              total_sadaqah: { type: 'number' },
              period: { type: 'string' },
              num_donations: { type: 'number' }
            }
          },
          breakdown: {
            type: 'object',
            properties: {
              by_type: { type: 'object' },
              by_category: { type: 'object' }
            }
          },
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                finding: { type: 'string' },
                significance: { type: 'string' }
              }
            }
          },
          trends: {
            type: 'object',
            properties: {
              consistency: { type: 'string' },
              growth: { type: 'string' },
              impact: { type: 'string' }
            }
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                area: { type: 'string' },
                suggestion: { type: 'string' },
                rationale: { type: 'string' }
              }
            }
          },
          Islamic_reflection: { type: 'string' },
          certificate_eligible: { type: 'boolean' }
        }
      }
    });

    return Response.json({
      success: true,
      report: response
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
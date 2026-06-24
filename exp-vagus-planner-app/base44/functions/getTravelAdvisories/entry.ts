import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { travel_date, destination = 'Saudi Arabia' } = await req.json();

    // Get current travel advisories and conditions
    const advisoryResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Get current travel information for ${destination} as of today, including:

1. Travel advisories and security status
2. Health recommendations and disease warnings
3. Local conditions and seasonal considerations
4. Entry requirements and documentation updates
5. Currency and exchange rate info
6. Local holidays and public events around ${travel_date}
7. Transportation infrastructure status
8. Communication and internet availability
9. Emergency services contact information

Travel date: ${travel_date}

Provide response in this JSON format:
{
  "security_level": "safe|moderate|cautious|avoid",
  "travel_advisories": ["current advisories"],
  "health_alerts": [{"alert": "description", "severity": "low|medium|high"}],
  "seasonal_info": {
    "weather_conditions": "description",
    "peak_season": boolean,
    "considerations": ["relevant considerations"]
  },
  "local_holidays": ["dates and names"],
  "documentation": {
    "passport_validity": "required validity in months",
    "entry_requirements": ["requirements"],
    "recent_changes": ["recent policy changes"]
  },
  "practical_info": {
    "currency": "SAR",
    "major_banks": ["list"],
    "communication": "description of internet/phone",
    "emergency_contact": "emergency number"
  },
  "travel_tips": ["practical tips for travelers"]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          security_level: { type: "string" },
          travel_advisories: { type: "array", items: { type: "string" } },
          health_alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                alert: { type: "string" },
                severity: { type: "string" }
              }
            }
          },
          seasonal_info: {
            type: "object",
            properties: {
              weather_conditions: { type: "string" },
              peak_season: { type: "boolean" },
              considerations: { type: "array", items: { type: "string" } }
            }
          },
          local_holidays: { type: "array", items: { type: "string" } },
          documentation: {
            type: "object",
            properties: {
              passport_validity: { type: "string" },
              entry_requirements: { type: "array", items: { type: "string" } },
              recent_changes: { type: "array", items: { type: "string" } }
            }
          },
          practical_info: {
            type: "object",
            properties: {
              currency: { type: "string" },
              major_banks: { type: "array", items: { type: "string" } },
              communication: { type: "string" },
              emergency_contact: { type: "string" }
            }
          },
          travel_tips: { type: "array", items: { type: "string" } }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      destination,
      travel_date,
      ...advisoryResponse,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Travel advisory fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
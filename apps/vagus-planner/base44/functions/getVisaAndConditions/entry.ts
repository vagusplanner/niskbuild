import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nationality, visa_type, travel_date } = await req.json();

    // Get comprehensive visa and travel condition info
    const visaResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide comprehensive CURRENT visa information for a ${nationality} citizen applying for a ${visa_type} visa to Saudi Arabia, with travel date of ${travel_date}.

Include CURRENT (2026) information:
{
  "visa_eligibility": {
    "eligible": boolean,
    "restrictions": ["any restrictions"],
    "notes": "eligibility notes"
  },
  "application": {
    "process": "step-by-step process",
    "required_documents": [
      {"document": "name", "notes": "any special notes"}
    ],
    "processing_time": "estimated time",
    "cost": "estimated cost in USD",
    "online_available": boolean
  },
  "entry_requirements": {
    "passport_validity": "months required after travel",
    "vaccinations": ["required vaccinations"],
    "health_insurance": boolean,
    "return_ticket": boolean
  },
  "valid_for": {
    "duration": "length of stay",
    "entries": "single/multiple",
    "validity_period": "how long visa is valid"
  },
  "real_time_status": {
    "current_processing_delays": "any current delays",
    "seasonal_advisories": "seasonal considerations for ${travel_date}",
    "capacity_notes": "any current capacity issues"
  },
  "recent_changes": ["changes in 2025-2026"],
  "helpful_links": [
    {"title": "link name", "description": "what it is"}
  ],
  "common_rejections": ["common reasons for rejection"],
  "pro_tips": ["helpful tips for approval"]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          visa_eligibility: {
            type: "object",
            properties: {
              eligible: { type: "boolean" },
              restrictions: { type: "array", items: { type: "string" } },
              notes: { type: "string" }
            }
          },
          application: {
            type: "object",
            properties: {
              process: { type: "string" },
              required_documents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    document: { type: "string" },
                    notes: { type: "string" }
                  }
                }
              },
              processing_time: { type: "string" },
              cost: { type: "string" },
              online_available: { type: "boolean" }
            }
          },
          entry_requirements: {
            type: "object",
            properties: {
              passport_validity: { type: "string" },
              vaccinations: { type: "array", items: { type: "string" } },
              health_insurance: { type: "boolean" },
              return_ticket: { type: "boolean" }
            }
          },
          valid_for: {
            type: "object",
            properties: {
              duration: { type: "string" },
              entries: { type: "string" },
              validity_period: { type: "string" }
            }
          },
          real_time_status: {
            type: "object",
            properties: {
              current_processing_delays: { type: "string" },
              seasonal_advisories: { type: "string" },
              capacity_notes: { type: "string" }
            }
          },
          recent_changes: { type: "array", items: { type: "string" } },
          helpful_links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" }
              }
            }
          },
          common_rejections: { type: "array", items: { type: "string" } },
          pro_tips: { type: "array", items: { type: "string" } }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      nationality,
      visa_type,
      travel_date,
      ...visaResponse,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Visa info fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
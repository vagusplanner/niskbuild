import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    if (action === 'generate_itinerary') {
      const { pilgrimage_type, start_date, duration, budget, participants, mobility_level } = params;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Hajj and Umrah guide. Create a comprehensive ${duration}-day ${pilgrimage_type} itinerary.

Details:
- Type: ${pilgrimage_type}
- Start Date: ${start_date}
- Duration: ${duration} days
- Budget: $${budget} for ${participants} person(s)
- Mobility: ${mobility_level}

Provide:
1. Daily schedule with Islamic rituals (with specific times and instructions)
2. Tourist activities in Mecca/Medina (historical sites, museums)
3. Budget breakdown (flights, hotels, food, transportation, sacrifice, gifts)
4. Packing list (Ihram, comfortable shoes, medications, etc.)
5. Transportation tips (metro, buses, walking routes)
6. Important duas for each ritual
7. Accommodation recommendations near Haram
8. Health and safety tips for ${mobility_level} mobility

Consider:
- Prayer times integration
- Rest periods based on mobility level
- Avoid crowds during peak times
- Wheelchair accessibility if needed
- Halal food options
- Emergency contacts

Be practical, detailed, and Islamic-compliant.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            daily_schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "number" },
                  title: { type: "string" },
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string",
                          enum: ["ritual", "tourist", "rest", "travel"]
                        },
                        title: { type: "string" },
                        description: { type: "string" },
                        time: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            budget_breakdown: {
              type: "object",
              properties: {
                flights: { type: "number" },
                accommodation: { type: "number" },
                food: { type: "number" },
                transportation: { type: "number" },
                sacrifice: { type: "number" },
                miscellaneous: { type: "number" }
              }
            },
            packing_list: {
              type: "array",
              items: { type: "string" }
            },
            accommodation_tips: { type: "string" },
            transportation_guide: { type: "string" },
            health_tips: { type: "string" }
          }
        }
      });

      return Response.json({
        success: true,
        itinerary: result
      });

    } else if (action === 'answer_question') {
      const { question } = params;

      const answer = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a knowledgeable Islamic scholar and Hajj/Umrah guide. Answer this question with authentic Islamic knowledge and practical advice:

Question: ${question}

Provide:
- Clear, accurate answer based on Quran and Sunnah
- Practical tips and advice
- Common mistakes to avoid
- References to Islamic sources when relevant
- Tourist/logistic information if applicable

Be concise but thorough, compassionate, and helpful.`,
        add_context_from_internet: true
      });

      return Response.json({
        success: true,
        answer,
        sources: "Based on Quran, Sunnah, and scholarly consensus"
      });

    } else if (action === 'check_visa') {
      const { nationality, visa_type } = params;

      const visaInfo = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide detailed visa requirements for ${visa_type} to Saudi Arabia for a ${nationality} citizen.

Include:
- Eligibility and restrictions
- Required documents (passport validity, photos, vaccination certificates)
- Application process and where to apply
- Processing time and fees
- Health requirements (meningitis vaccine, COVID-19, etc.)
- Important notes and tips
- Online vs travel agency application

Be accurate and up-to-date with 2026 regulations.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            eligible: { type: "boolean" },
            process: { type: "string" },
            requirements: {
              type: "array",
              items: { type: "string" }
            },
            health_requirements: {
              type: "array",
              items: { type: "string" }
            },
            cost: { type: "string" },
            processing_time: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      return Response.json({
        success: true,
        ...visaInfo
      });

    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ 
      error: error.message,
      details: 'Hajj/Umrah AI assistant failed'
    }, { status: 500 });
  }
});
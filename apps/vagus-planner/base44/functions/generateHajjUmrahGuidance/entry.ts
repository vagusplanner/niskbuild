import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guidance_type, pilgrimage_type, travel_dates, current_stage, user_preferences } = await req.json();

    let prompt = '';
    let responseSchema = {};

    if (guidance_type === 'complete_itinerary') {
      prompt = `Create a comprehensive ${pilgrimage_type} itinerary for ${user.full_name}.

TRAVEL DATES: ${travel_dates?.departure_date} to ${travel_dates?.return_date}
TYPE: ${pilgrimage_type}
PREFERENCES: ${JSON.stringify(user_preferences || {})}

Generate a detailed day-by-day plan including:
- Pre-departure preparations (2 weeks before)
- Daily schedule during pilgrimage
- Essential rituals with timing
- Rest periods and flexibility
- Post-pilgrimage actions

For each day/stage, include:
1. Timeline and location
2. Rituals to perform
3. Essential duas and prayers
4. Practical tips
5. Common mistakes to avoid
6. Spiritual significance

Be detailed, practical, and spiritually meaningful.`;

      responseSchema = {
        type: "object",
        properties: {
          pre_departure: {
            type: "array",
            items: {
              type: "object",
              properties: {
                timeline: { type: "string" },
                task: { type: "string" },
                importance: { type: "string", enum: ["critical", "important", "recommended"] },
                details: { type: "string" }
              }
            }
          },
          daily_itinerary: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                date: { type: "string" },
                title: { type: "string" },
                location: { type: "string" },
                activities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string" },
                      activity: { type: "string" },
                      ritual_name: { type: "string" },
                      description: { type: "string" },
                      duas: { type: "array", items: { type: "string" } },
                      tips: { type: "array", items: { type: "string" } }
                    }
                  }
                },
                spiritual_focus: { type: "string" }
              }
            }
          },
          post_pilgrimage: {
            type: "array",
            items: {
              type: "object",
              properties: {
                task: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      };

    } else if (guidance_type === 'ritual_explanation') {
      const ritual = user_preferences?.ritual_name || 'Tawaf';
      
      prompt = `Provide comprehensive explanation of the ${ritual} ritual in ${pilgrimage_type}.

Include:
1. WHAT: Clear description of the ritual
2. WHY: Spiritual significance and historical context
3. HOW: Step-by-step practical instructions
4. WHEN: Timing and sequence in pilgrimage
5. DUAS: Essential prayers for each step
6. COMMON MISTAKES: What to avoid
7. SPIRITUAL TIPS: How to maximize spiritual benefit

Be detailed, authentic, and spiritually enriching.`;

      responseSchema = {
        type: "object",
        properties: {
          ritual_name: { type: "string" },
          brief_description: { type: "string" },
          spiritual_significance: { type: "string" },
          historical_context: { type: "string" },
          step_by_step_guide: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_number: { type: "number" },
                action: { type: "string" },
                details: { type: "string" },
                duas: { type: "array", items: { type: "string" } },
                tips: { type: "string" }
              }
            }
          },
          timing: { type: "string" },
          duration: { type: "string" },
          common_mistakes: { type: "array", items: { type: "string" } },
          spiritual_advice: { type: "string" }
        }
      };

    } else if (guidance_type === 'packing_list') {
      prompt = `Generate a comprehensive packing list for ${pilgrimage_type}.

Consider:
- Essential religious items
- Clothing (ihram, modest wear)
- Health and medicine
- Documents
- Technology
- Comfort items
- Weather-appropriate gear

Organize by category and mark priority levels. Include specific recommendations and quantities.`;

      responseSchema = {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category_name: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      quantity: { type: "string" },
                      priority: { type: "string", enum: ["essential", "important", "optional"] },
                      notes: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          additional_tips: { type: "array", items: { type: "string" } }
        }
      };

    } else if (guidance_type === 'duas_compilation') {
      const stage = user_preferences?.stage || 'general';
      
      prompt = `Compile essential duas for the ${stage} stage of ${pilgrimage_type}.

For each dua provide:
- Arabic text
- Transliteration
- English translation
- When to recite
- Spiritual benefit

Include 8-10 most important duas for this stage.`;

      responseSchema = {
        type: "object",
        properties: {
          stage: { type: "string" },
          duas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                arabic: { type: "string" },
                transliteration: { type: "string" },
                translation: { type: "string" },
                occasion: { type: "string" },
                benefit: { type: "string" },
                source: { type: "string" }
              }
            },
            minItems: 8,
            maxItems: 10
          }
        }
      };

    } else if (guidance_type === 'navigation_guide') {
      const location = user_preferences?.from || 'hotel';
      const destination = user_preferences?.to || 'Masjid al-Haram';
      
      prompt = `Provide detailed navigation guidance from ${location} to ${destination} in Makkah/Madinah.

Include:
1. Multiple route options
2. Distance and walking time
3. Landmarks to look for
4. Accessibility considerations
5. Best times to travel
6. Safety tips
7. What to do if lost

Be practical and helpful for first-time pilgrims.`;

      responseSchema = {
        type: "object",
        properties: {
          routes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                route_name: { type: "string" },
                distance: { type: "string" },
                walking_time: { type: "string" },
                difficulty: { type: "string", enum: ["easy", "moderate", "difficult"] },
                directions: { type: "array", items: { type: "string" } },
                landmarks: { type: "array", items: { type: "string" } }
              }
            }
          },
          best_time: { type: "string" },
          accessibility_info: { type: "string" },
          safety_tips: { type: "array", items: { type: "string" } },
          emergency_contacts: { type: "array", items: { type: "string" } }
        }
      };
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      add_context_from_internet: true
    });

    return Response.json({
      success: true,
      guidance: result,
      generated_for: {
        user: user.full_name,
        type: pilgrimage_type,
        guidance_type
      }
    });

  } catch (error) {
    console.error('Error generating Hajj/Umrah guidance:', error);
    return Response.json({
      error: 'Failed to generate guidance',
      details: error.message
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, destination, userData } = await req.json();

    // Fetch trip feedback to enhance personalization
    const feedback = await base44.asServiceRole.entities.TripFeedback.list('-created_date', 20);
    
    let prompt = '';
    let schema = {};

    if (type === 'themes') {
      prompt = `Based on this user profile and travel history, suggest 4 personalized thematic trip ideas:

USER PROFILE:
- Travel interests: ${userData.travel_interests?.join(', ') || 'varied'}
- Dietary preferences: ${userData.dietary_preferences?.join(', ') || 'none specified'}
- Budget range: ${userData.budget_range || 'flexible'}

PAST TRIPS:
${userData.past_holidays.map(h => `- ${h.destination} (${h.status})`).join('\n')}

TRIP FEEDBACK (Learn from past experiences):
${feedback.filter(f => f.destination_rating).map(f => `
- Destination rated ${f.destination_rating}/5
- Would return: ${f.would_return ? 'Yes' : 'No'}
- Budget accuracy: ${f.budget_accuracy}
- Highlights: ${f.highlights?.join(', ') || 'none'}
- Review: ${f.destination_review?.substring(0, 100) || 'N/A'}
`).join('\n') || 'No feedback yet'}

IMPORTANT: Use the feedback to understand what the user loved/disliked and suggest similar experiences they rated highly.

Suggest diverse themes like Adventure, Beach Relaxation, Cultural Immersion, Food Tour, Wellness Retreat, etc. Make them specific and personalized to their interests.`;

      schema = {
        type: "object",
        properties: {
          themes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                theme: { type: "string" },
                description: { type: "string" },
                destinations: { 
                  type: "array",
                  items: { type: "string" }
                },
                best_season: { type: "string" },
                estimated_budget: { type: "string" }
              }
            }
          }
        }
      };
    } else if (type === 'packing') {
      prompt = `Create a personalized packing list for a trip to ${destination}:

TRIP DETAILS:
- Destination: ${destination}
- Travel interests: ${userData.travel_interests?.join(', ') || 'general tourism'}
- Dietary preferences: ${userData.dietary_preferences?.join(', ') || 'none'}
- Duration: ${userData.duration || 'week-long'}

Consider climate, activities, cultural requirements, and personal preferences. Categorize items (clothing, electronics, toiletries, documents, etc.).`;

      schema = {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      essential: { type: "boolean" },
                      note: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      };
    } else if (type === 'experiences') {
      const relevantFeedback = feedback.filter(f => 
        f.destination_review?.toLowerCase().includes(destination.toLowerCase())
      );
      
      prompt = `Suggest hidden gems and local experiences in ${destination}:

USER INTERESTS: ${userData.travel_interests?.join(', ') || 'varied'}
BUDGET: ${userData.budget || 'moderate'}

PAST FEEDBACK ON SIMILAR DESTINATIONS:
${relevantFeedback.map(f => `
- Activities rated: ${f.activities_rating}/5
- Review: ${f.activities_review || 'N/A'}
- Highlights: ${f.highlights?.join(', ') || 'N/A'}
`).join('\n') || 'No similar feedback'}

Focus on:
1. Authentic local experiences tourists often miss
2. Hidden gems known to locals
3. Unique activities aligned with user interests
4. Off-the-beaten-path locations

Be specific with names and brief descriptions.`;

      schema = {
        type: "object",
        properties: {
          experiences: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                description: { type: "string" },
                estimated_cost: { type: "string" },
                insider_tip: { type: "string" }
              }
            }
          }
        }
      };
    } else if (type === 'restaurants') {
      const cuisinePreferences = feedback
        .filter(f => f.recommendations_for_others?.toLowerCase().includes('food') || f.recommendations_for_others?.toLowerCase().includes('restaurant'))
        .map(f => f.recommendations_for_others)
        .join('; ');

      prompt = `Recommend restaurants in ${destination}:

USER PREFERENCES:
- Dietary: ${userData.dietary_preferences?.join(', ') || 'no restrictions'}
- Budget per meal: ${userData.budget || 'moderate'}
- Interests: ${userData.travel_interests?.join(', ') || 'varied'}

INSIGHTS FROM PAST TRIPS:
${cuisinePreferences || 'No specific food preferences noted yet'}

Suggest 5-6 restaurants across different price points, cuisines, and atmospheres. Include local favorites and hidden gems.`;

      schema = {
        type: "object",
        properties: {
          restaurants: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                cuisine: { type: "string" },
                price_range: { type: "string" },
                specialty: { type: "string" },
                atmosphere: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          }
        }
      };
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
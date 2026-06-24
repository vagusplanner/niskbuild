import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch nutrition history and preferences
    const [nutrition, settings, goals] = await Promise.all([
      base44.entities.Nutrition.list('-created_date', 21),
      base44.entities.UserSettings.list(),
      base44.entities.Goal.filter({ category: 'health' })
    ]);

    const userSettings = settings[0] || {};

    // Analyze eating patterns
    const mealTypes = nutrition.map(n => n.meal_type);
    const avgCalories = nutrition.length > 0 
      ? nutrition.reduce((acc, n) => acc + (n.calories || 0), 0) / nutrition.length 
      : 2000;

    const dietLabels = {
      halal: 'Halal (Islamically permissible only)',
      kosher: 'Kosher (Jewish dietary laws)',
      vegetarian: 'Vegetarian (no meat/fish)',
      vegan: 'Vegan (no animal products)',
      gluten_free: 'Gluten-free',
      dairy_free: 'Dairy-free',
      nut_free: 'Nut-free'
    };
    const dietaryStr = (userSettings.dietary_preferences || [])
      .map(d => dietLabels[d] || d).join(', ') || 'None specified';

    const context = `
User Nutrition Profile:
- Recent meals logged: ${nutrition.length} (last 3 weeks)
- Average daily calories: ${avgCalories.toFixed(0)}
- Dietary requirements (MUST be strictly followed): ${dietaryStr}
- Dietary notes/allergies: ${userSettings.dietary_notes || 'None'}
- Health goals: ${goals.map(g => g.title).join(', ') || 'General wellness'}

Recent meal patterns:
${nutrition.slice(0, 5).map(n => `- ${n.meal_type}: ${n.food_items || 'Not specified'} (${n.calories || 0} cal)`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a certified nutritionist. Create a personalized 7-day meal plan for this user.

${context}

Provide a meal plan in JSON format:
{
  "plan": {
    "overview": "Brief summary of nutritional approach",
    "daily_target": {
      "calories": 2000,
      "protein_g": 150,
      "carbs_g": 200,
      "fat_g": 65
    },
    "weekly_meals": [
      {
        "day": "Monday",
        "meals": [
          {
            "meal_type": "breakfast",
            "name": "Oatmeal with berries",
            "calories": 400,
            "protein_g": 15,
            "ingredients": ["Oats", "Blueberries", "Almonds", "Honey"],
            "prep_time_minutes": 10,
            "instructions": "Quick preparation steps"
          }
        ]
      }
    ],
    "shopping_list": ["Item 1", "Item 2"],
    "tips": ["Tip 1", "Tip 2", "Tip 3"]
  }
}

Guidelines:
- Respect dietary preferences
- Balance macronutrients
- Include variety
- Make it practical and affordable
- Consider prep time`,
      response_json_schema: {
        type: "object",
        properties: {
          plan: {
            type: "object",
            properties: {
              overview: { type: "string" },
              daily_target: {
                type: "object",
                properties: {
                  calories: { type: "number" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" }
                }
              },
              weekly_meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    day: { type: "string" },
                    meals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          meal_type: { type: "string" },
                          name: { type: "string" },
                          calories: { type: "number" },
                          protein_g: { type: "number" },
                          ingredients: { type: "array", items: { type: "string" } },
                          prep_time_minutes: { type: "number" },
                          instructions: { type: "string" }
                        }
                      }
                    }
                  }
                }
              },
              shopping_list: { type: "array", items: { type: "string" } },
              tips: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.plan || {}
    });

  } catch (error) {
    console.error('Meal plan generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
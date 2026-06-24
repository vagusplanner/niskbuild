import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meal_type, available_ingredients, cuisine_preference } = await req.json();

    // Fetch user preferences and recent meals
    const [settings, nutrition] = await Promise.all([
      base44.entities.UserSettings.list(),
      base44.entities.Nutrition.list('-created_date', 14)
    ]);

    const userSettings = settings[0] || {};
    const dietaryPrefs = userSettings.dietary_preferences || [];

    const context = `
User Profile:
- Dietary preferences: ${dietaryPrefs.join(', ') || 'None specified'}
- Cuisine preference: ${cuisine_preference || 'Any'}
- Available ingredients: ${available_ingredients || 'Common pantry items'}
- Meal type: ${meal_type || 'Any'}

Recent meals (avoid similar):
${nutrition.slice(0, 5).map(n => `- ${n.food_items}`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a creative chef and nutritionist. Generate 3 personalized recipes.

${context}

Provide recipes in JSON format:
{
  "recipes": [
    {
      "name": "Recipe Name",
      "cuisine": "Italian",
      "meal_type": "dinner",
      "prep_time_minutes": 15,
      "cook_time_minutes": 30,
      "servings": 4,
      "difficulty": "easy",
      "calories_per_serving": 450,
      "macros": {
        "protein_g": 30,
        "carbs_g": 45,
        "fat_g": 15,
        "fiber_g": 8
      },
      "ingredients": [
        {
          "item": "Chicken breast",
          "amount": "500g",
          "notes": "Can substitute with tofu"
        }
      ],
      "instructions": [
        "Step 1 details",
        "Step 2 details"
      ],
      "tips": ["Tip 1", "Tip 2"],
      "dietary_tags": ["high-protein", "gluten-free"]
    }
  ]
}

Guidelines:
- Use available ingredients when possible
- Respect dietary restrictions
- Provide variety in recipes
- Include substitution options
- Make instructions clear and detailed`,
      response_json_schema: {
        type: "object",
        properties: {
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                cuisine: { type: "string" },
                meal_type: { type: "string" },
                prep_time_minutes: { type: "number" },
                cook_time_minutes: { type: "number" },
                servings: { type: "number" },
                difficulty: { type: "string" },
                calories_per_serving: { type: "number" },
                macros: {
                  type: "object",
                  properties: {
                    protein_g: { type: "number" },
                    carbs_g: { type: "number" },
                    fat_g: { type: "number" },
                    fiber_g: { type: "number" }
                  }
                },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      item: { type: "string" },
                      amount: { type: "string" },
                      notes: { type: "string" }
                    }
                  }
                },
                instructions: {
                  type: "array",
                  items: { type: "string" }
                },
                tips: {
                  type: "array",
                  items: { type: "string" }
                },
                dietary_tags: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.recipes || []
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { duration_days = 7 } = await req.json();

    // Fetch user data
    const [settings, healthGoals, recentNutrition, exercise] = await Promise.all([
      base44.entities.UserSettings.list(),
      base44.entities.Goal.filter({ category: 'health', status: 'active' }),
      base44.entities.Nutrition.list('-date', 14),
      base44.entities.Exercise.list('-date', 7)
    ]);

    const userSettings = settings[0] || {};
    const dietaryPreferences = userSettings.dietary_preferences || [];
    
    // Calculate activity level
    const weeklyExerciseMinutes = exercise.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const activityLevel = weeklyExerciseMinutes > 180 ? 'high' : weeklyExerciseMinutes > 90 ? 'moderate' : 'low';

    // Extract health goals
    const weightGoal = healthGoals.find(g => g.metadata?.goal_type?.includes('weight'));
    const calorieGoal = weightGoal?.metadata?.goal_type === 'weight_loss' ? 'deficit' : 
                        weightGoal?.metadata?.goal_type === 'weight_gain' ? 'surplus' : 'maintenance';

    const dietPlan = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional nutritionist creating a personalized ${duration_days}-day meal plan.

USER PROFILE:
- Dietary Preferences: ${dietaryPreferences.join(', ') || 'None specified'}
- Activity Level: ${activityLevel} (${weeklyExerciseMinutes} mins/week)
- Calorie Goal: ${calorieGoal}
${weightGoal ? `- Weight Goal: ${weightGoal.title} (${weightGoal.metadata.current_value} → ${weightGoal.metadata.target_value} ${weightGoal.metadata.unit})` : ''}
- Recent Eating Patterns: ${recentNutrition.slice(0, 3).map(n => n.meal_name).join(', ')}

CREATE A COMPLETE ${duration_days}-DAY MEAL PLAN:

Requirements:
1. Each day should have 3 main meals + 2 snacks
2. Include detailed recipes with ingredients and instructions
3. Provide accurate macro breakdown (protein, carbs, fats, calories)
4. Respect dietary preferences (${dietaryPreferences.join(', ') || 'omnivore'})
5. Include variety - no repeated meals
6. Consider activity level for portions
7. Align with calorie goal (${calorieGoal})

Make it realistic, delicious, and achievable. Include shopping list at the end.

Return as JSON:
{
  "daily_plans": [
    {
      "day": 1,
      "date": "Day 1",
      "total_calories": 2000,
      "total_protein": 150,
      "total_carbs": 200,
      "total_fats": 60,
      "meals": [
        {
          "meal_type": "breakfast",
          "time": "8:00 AM",
          "name": "Meal name",
          "description": "Brief description",
          "calories": 400,
          "protein": 25,
          "carbs": 45,
          "fats": 12,
          "ingredients": ["ingredient 1", "ingredient 2"],
          "instructions": ["step 1", "step 2"],
          "prep_time_minutes": 15
        }
      ]
    }
  ],
  "shopping_list": {
    "proteins": ["item1", "item2"],
    "vegetables": ["item1", "item2"],
    "fruits": ["item1", "item2"],
    "grains": ["item1", "item2"],
    "dairy": ["item1", "item2"],
    "others": ["item1", "item2"]
  },
  "nutrition_tips": ["tip1", "tip2", "tip3"]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          daily_plans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'number' },
                date: { type: 'string' },
                total_calories: { type: 'number' },
                total_protein: { type: 'number' },
                total_carbs: { type: 'number' },
                total_fats: { type: 'number' },
                meals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      meal_type: { type: 'string' },
                      time: { type: 'string' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      calories: { type: 'number' },
                      protein: { type: 'number' },
                      carbs: { type: 'number' },
                      fats: { type: 'number' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      instructions: { type: 'array', items: { type: 'string' } },
                      prep_time_minutes: { type: 'number' }
                    }
                  }
                }
              }
            }
          },
          shopping_list: { type: 'object' },
          nutrition_tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      diet_plan: dietPlan,
      generated_for: {
        dietary_preferences: dietaryPreferences,
        activity_level: activityLevel,
        calorie_goal: calorieGoal
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
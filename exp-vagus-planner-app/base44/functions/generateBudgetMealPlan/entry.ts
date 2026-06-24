/**
 * generateBudgetMealPlan
 * Takes a weekly grocery budget + family size + dietary prefs and generates:
 * - 7-day meal plan with nutritional info
 * - Itemized grocery list with estimated costs per item
 * - Total cost vs budget breakdown
 * - Smart tips to stay under budget
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      weekly_budget = 100,
      currency = 'GBP',
      family_size = 4,
      dietary_preferences = ['halal'],
      dietary_notes = '',
      calorie_goal = 2000,
      week_start,
    } = await req.json();

    const dietaryStr = dietary_preferences.length > 0
      ? dietary_preferences.join(', ')
      : 'halal';

    const prompt = `You are an expert family nutritionist and budget meal planner. Generate a complete 7-day meal plan WITH a detailed itemized grocery list and cost estimates.

CONSTRAINTS:
- Family size: ${family_size} people
- Weekly grocery budget: ${currency === 'GBP' ? '£' : '$'}${weekly_budget}
- Dietary requirements: ${dietaryStr}
- Daily calorie target per person: ${calorie_goal} kcal
- Extra notes: ${dietary_notes || 'none'}
${dietary_preferences.includes('halal') ? '- All ingredients MUST be halal (no pork, no alcohol in cooking, halal-certified meat)' : ''}

MEAL PLAN RULES:
1. Create varied, nutritious meals using affordable ingredients
2. Reuse ingredients across days to reduce waste and cost
3. Include at least 2 servings of vegetables per day
4. Balance protein, carbs and healthy fats
5. Batch cooking suggestions where helpful (e.g. cook rice for 2 days)
6. Keep meals family-friendly and not too complex

GROCERY LIST RULES:
1. List every ingredient needed for the full week
2. Include realistic quantity (e.g. "1kg chicken breast", "400g tin chickpeas x3")
3. Provide an estimated cost in ${currency} based on typical ${currency === 'GBP' ? 'UK supermarket (Tesco/Asda)' : 'US grocery store'} prices for a family of ${family_size}
4. Group items by supermarket aisle category
5. Total cost MUST stay within the ${currency === 'GBP' ? '£' : '$'}${weekly_budget} budget
6. If budget is tight, prioritize protein and vegetables over processed foods

Return the full meal plan, grocery list with costs, and budget summary.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          plan: {
            type: 'array',
            description: '7-day meal plan (one entry per day)',
            items: {
              type: 'object',
              properties: {
                day: { type: 'string' },
                breakfast: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    calories: { type: 'number' },
                    protein: { type: 'number' },
                    carbs: { type: 'number' },
                    fats: { type: 'number' }
                  }
                },
                lunch: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    calories: { type: 'number' },
                    protein: { type: 'number' },
                    carbs: { type: 'number' },
                    fats: { type: 'number' }
                  }
                },
                dinner: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    calories: { type: 'number' },
                    protein: { type: 'number' },
                    carbs: { type: 'number' },
                    fats: { type: 'number' }
                  }
                },
                snack: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    calories: { type: 'number' }
                  }
                },
                batch_cook_tip: { type: 'string', description: 'Optional tip about batch cooking for this day' }
              }
            }
          },
          grocery_list: {
            type: 'array',
            description: 'Itemized grocery list grouped by category',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'e.g. Meat & Fish, Dairy, Produce, Pantry, Frozen, Bakery' },
                item: { type: 'string', description: 'Item name with quantity' },
                estimated_cost: { type: 'number', description: 'Cost in the target currency' },
                notes: { type: 'string', description: 'Optional buying tip, e.g. buy in bulk, frozen is cheaper' }
              }
            }
          },
          budget_summary: {
            type: 'object',
            properties: {
              total_estimated_cost: { type: 'number' },
              budget: { type: 'number' },
              remaining: { type: 'number' },
              is_within_budget: { type: 'boolean' },
              cost_per_person_per_day: { type: 'number' },
              most_expensive_category: { type: 'string' },
              biggest_saving_tip: { type: 'string' }
            }
          },
          savings_tips: {
            type: 'array',
            items: { type: 'string' },
            description: '3-5 actionable tips to save money on this grocery list'
          },
          nutrition_summary: {
            type: 'object',
            properties: {
              avg_daily_calories: { type: 'number' },
              avg_daily_protein: { type: 'number' },
              avg_daily_carbs: { type: 'number' },
              avg_daily_fats: { type: 'number' },
              nutrition_score: { type: 'number', description: '1-10 overall nutritional quality' },
              nutrition_notes: { type: 'string' }
            }
          }
        }
      }
    });

    console.log(`[generateBudgetMealPlan] Generated plan for budget ${currency}${weekly_budget}, family ${family_size}, dietary: ${dietaryStr}`);

    return Response.json({
      ...result,
      week_start,
      weekly_budget,
      currency,
      family_size,
      dietary_preferences,
    });

  } catch (error) {
    console.error('[generateBudgetMealPlan] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
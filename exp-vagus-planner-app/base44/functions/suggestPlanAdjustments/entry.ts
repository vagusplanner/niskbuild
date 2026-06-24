import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan_type, user_feedback } = await req.json();

    // Fetch recent data for analysis
    const [exercises, nutrition, mood, sleep] = await Promise.all([
      base44.entities.Exercise.list('-created_date', 14),
      base44.entities.Nutrition.list('-created_date', 14),
      base44.entities.Mood.list('-created_date', 14),
      base44.entities.Sleep.list('-created_date', 14)
    ]);

    // Analyze recent performance
    const recentPerformance = {
      exercise_adherence: exercises.length / 14, // per day
      avg_workout_duration: exercises.length > 0 ? exercises.reduce((s, e) => s + (e.duration || 0), 0) / exercises.length : 0,
      missed_workouts: Math.max(0, 14 - exercises.length),
      energy_levels: mood.map(m => m.energy_level).filter(Boolean),
      sleep_quality: sleep.filter(s => s.quality === 'poor' || (s.hours_slept || 0) < 6).length,
      nutrition_consistency: nutrition.length / (14 * 3), // assuming 3 meals per day
      recent_mood_trend: mood.slice(0, 7).reduce((s, m) => s + m.mood_rating, 0) / Math.min(7, mood.length)
    };

    const context = `
User Feedback: ${user_feedback || 'None provided'}
Plan Type: ${plan_type || 'general'}

Recent Performance (Last 2 weeks):
- Exercise sessions: ${exercises.length} (${recentPerformance.exercise_adherence.toFixed(1)}/day)
- Average workout: ${recentPerformance.avg_workout_duration.toFixed(0)} minutes
- Missed workouts: ${recentPerformance.missed_workouts}
- Energy levels: ${recentPerformance.energy_levels.join(', ') || 'Not tracked'}
- Poor sleep nights: ${recentPerformance.sleep_quality}
- Nutrition tracking: ${(recentPerformance.nutrition_consistency * 100).toFixed(0)}%
- Recent mood average: ${recentPerformance.recent_mood_trend.toFixed(1)}/10

Recent Activities:
${exercises.slice(0, 5).map(e => `- ${e.activity_type}: ${e.duration}min (${e.intensity || 'moderate'})`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an adaptive fitness and nutrition coach. Analyze the user's recent performance and suggest plan adjustments.

${context}

Provide suggestions in JSON format:
{
  "adjustments": {
    "overall_assessment": "Brief assessment of current performance",
    "suggested_changes": [
      {
        "area": "workout_intensity",
        "current_level": "moderate",
        "suggested_level": "increase to high",
        "reason": "User is consistently meeting targets with good energy",
        "confidence": "high",
        "implementation": "Add 10 minutes to cardio sessions"
      }
    ],
    "workout_modifications": {
      "duration_adjustment": "Increase/decrease by X minutes",
      "intensity_adjustment": "Increase/maintain/decrease",
      "frequency_adjustment": "Add/remove X sessions per week",
      "exercise_variety": "Suggested new activities to try",
      "recovery_needs": "Rest day recommendations"
    },
    "nutrition_modifications": {
      "calorie_adjustment": "Increase/maintain/decrease by X",
      "macro_adjustments": "Protein/carbs/fats suggestions",
      "meal_timing": "Timing recommendations",
      "hydration_focus": "Water intake suggestions"
    },
    "recovery_focus": {
      "sleep_target": "Hours needed",
      "stress_management": "Techniques to implement",
      "active_recovery": "Light activities suggested"
    },
    "priority_actions": [
      {
        "action": "Specific action to take",
        "priority": "high",
        "expected_benefit": "What this will improve",
        "timeframe": "When to implement"
      }
    ],
    "encouragement": "Motivational message based on progress"
  }
}

Guidelines:
- Be realistic and gradual with changes
- Consider user feedback seriously
- Adapt based on adherence patterns
- Focus on sustainability
- Provide specific, actionable advice`,
      response_json_schema: {
        type: "object",
        properties: {
          adjustments: {
            type: "object",
            properties: {
              overall_assessment: { type: "string" },
              suggested_changes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    area: { type: "string" },
                    current_level: { type: "string" },
                    suggested_level: { type: "string" },
                    reason: { type: "string" },
                    confidence: { type: "string" },
                    implementation: { type: "string" }
                  }
                }
              },
              workout_modifications: {
                type: "object",
                properties: {
                  duration_adjustment: { type: "string" },
                  intensity_adjustment: { type: "string" },
                  frequency_adjustment: { type: "string" },
                  exercise_variety: { type: "string" },
                  recovery_needs: { type: "string" }
                }
              },
              nutrition_modifications: {
                type: "object",
                properties: {
                  calorie_adjustment: { type: "string" },
                  macro_adjustments: { type: "string" },
                  meal_timing: { type: "string" },
                  hydration_focus: { type: "string" }
                }
              },
              recovery_focus: {
                type: "object",
                properties: {
                  sleep_target: { type: "string" },
                  stress_management: { type: "string" },
                  active_recovery: { type: "string" }
                }
              },
              priority_actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    action: { type: "string" },
                    priority: { type: "string" },
                    expected_benefit: { type: "string" },
                    timeframe: { type: "string" }
                  }
                }
              },
              encouragement: { type: "string" }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.adjustments || {}
    });

  } catch (error) {
    console.error('Plan adjustment error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
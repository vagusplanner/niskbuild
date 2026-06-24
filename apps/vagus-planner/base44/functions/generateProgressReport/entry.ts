import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeframe } = await req.json();
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 14;

    // Fetch all health data
    const [exercises, nutrition, mood, sleep, goals] = await Promise.all([
      base44.entities.Exercise.list('-created_date', days),
      base44.entities.Nutrition.list('-created_date', days),
      base44.entities.Mood.list('-created_date', days),
      base44.entities.Sleep.list('-created_date', days),
      base44.entities.Goal.filter({ category: 'health' })
    ]);

    // Calculate statistics
    const exerciseStats = {
      total_sessions: exercises.length,
      total_minutes: exercises.reduce((sum, e) => sum + (e.duration || 0), 0),
      avg_duration: exercises.length > 0 ? exercises.reduce((sum, e) => sum + (e.duration || 0), 0) / exercises.length : 0,
      types: [...new Set(exercises.map(e => e.activity_type))],
      by_intensity: {
        low: exercises.filter(e => e.intensity === 'low').length,
        moderate: exercises.filter(e => e.intensity === 'moderate').length,
        high: exercises.filter(e => e.intensity === 'high').length
      }
    };

    const nutritionStats = {
      meals_logged: nutrition.length,
      avg_calories: nutrition.length > 0 ? nutrition.reduce((sum, n) => sum + (n.calories || 0), 0) / nutrition.length : 0,
      meals_by_type: {
        breakfast: nutrition.filter(n => n.meal_type === 'breakfast').length,
        lunch: nutrition.filter(n => n.meal_type === 'lunch').length,
        dinner: nutrition.filter(n => n.meal_type === 'dinner').length,
        snack: nutrition.filter(n => n.meal_type === 'snack').length
      }
    };

    const moodStats = {
      entries: mood.length,
      avg_rating: mood.length > 0 ? mood.reduce((sum, m) => sum + m.mood_rating, 0) / mood.length : 0,
      trend: mood.length >= 3 ? (mood[0].mood_rating > mood[mood.length - 1].mood_rating ? 'improving' : 'declining') : 'stable',
      low_days: mood.filter(m => m.mood_rating < 5).length,
      high_days: mood.filter(m => m.mood_rating >= 8).length
    };

    const sleepStats = {
      nights_logged: sleep.length,
      avg_hours: sleep.length > 0 ? sleep.reduce((sum, s) => sum + (s.hours_slept || 0), 0) / sleep.length : 0,
      quality_breakdown: {
        excellent: sleep.filter(s => s.quality === 'excellent').length,
        good: sleep.filter(s => s.quality === 'good').length,
        fair: sleep.filter(s => s.quality === 'fair').length,
        poor: sleep.filter(s => s.quality === 'poor').length
      },
      nights_below_6h: sleep.filter(s => (s.hours_slept || 0) < 6).length
    };

    const context = `
Health Data Analysis (Last ${days} days):

EXERCISE:
- Sessions: ${exerciseStats.total_sessions}
- Total time: ${exerciseStats.total_minutes} minutes
- Average duration: ${exerciseStats.avg_duration.toFixed(0)} minutes
- Activity types: ${exerciseStats.types.join(', ')}
- Intensity distribution: Low(${exerciseStats.by_intensity.low}), Moderate(${exerciseStats.by_intensity.moderate}), High(${exerciseStats.by_intensity.high})

NUTRITION:
- Meals logged: ${nutritionStats.meals_logged}
- Average calories: ${nutritionStats.avg_calories.toFixed(0)}
- Breakfast: ${nutritionStats.meals_by_type.breakfast}, Lunch: ${nutritionStats.meals_by_type.lunch}, Dinner: ${nutritionStats.meals_by_type.dinner}

MOOD:
- Entries: ${moodStats.entries}
- Average rating: ${moodStats.avg_rating.toFixed(1)}/10
- Trend: ${moodStats.trend}
- Low mood days: ${moodStats.low_days}, High mood days: ${moodStats.high_days}

SLEEP:
- Nights logged: ${sleepStats.nights_logged}
- Average hours: ${sleepStats.avg_hours.toFixed(1)}h
- Quality: Excellent(${sleepStats.quality_breakdown.excellent}), Good(${sleepStats.quality_breakdown.good}), Fair(${sleepStats.quality_breakdown.fair}), Poor(${sleepStats.quality_breakdown.poor})
- Nights < 6h: ${sleepStats.nights_below_6h}

GOALS:
${goals.map(g => `- ${g.title} (${g.status})`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a health data analyst. Analyze this user's health data and provide insights with correlations.

${context}

Provide analysis in JSON format:
{
  "report": {
    "summary": "Overall assessment of progress",
    "key_achievements": ["Achievement 1", "Achievement 2"],
    "areas_of_concern": ["Concern 1", "Concern 2"],
    "trends": [
      {
        "category": "exercise",
        "direction": "improving",
        "description": "Detailed trend analysis",
        "chart_data": [65, 70, 68, 75, 72, 80, 85]
      }
    ],
    "correlations": [
      {
        "finding": "Sleep and mood correlation",
        "description": "Detailed explanation",
        "strength": "strong",
        "recommendation": "What to do about it"
      }
    ],
    "week_comparison": {
      "this_period": "Current period stats",
      "vs_previous": "Comparison with previous period",
      "percent_change": 15
    },
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "goal_progress": [
      {
        "goal_name": "Goal name",
        "progress_percent": 75,
        "status": "on_track",
        "next_steps": "What to do next"
      }
    ]
  }
}

Focus on:
- Meaningful correlations between metrics
- Actionable insights
- Positive reinforcement
- Data-driven recommendations`,
      response_json_schema: {
        type: "object",
        properties: {
          report: {
            type: "object",
            properties: {
              summary: { type: "string" },
              key_achievements: { type: "array", items: { type: "string" } },
              areas_of_concern: { type: "array", items: { type: "string" } },
              trends: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    direction: { type: "string" },
                    description: { type: "string" },
                    chart_data: { type: "array", items: { type: "number" } }
                  }
                }
              },
              correlations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    finding: { type: "string" },
                    description: { type: "string" },
                    strength: { type: "string" },
                    recommendation: { type: "string" }
                  }
                }
              },
              week_comparison: {
                type: "object",
                properties: {
                  this_period: { type: "string" },
                  vs_previous: { type: "string" },
                  percent_change: { type: "number" }
                }
              },
              recommendations: { type: "array", items: { type: "string" } },
              goal_progress: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    goal_name: { type: "string" },
                    progress_percent: { type: "number" },
                    status: { type: "string" },
                    next_steps: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: {
        ...response.report,
        raw_stats: {
          exercise: exerciseStats,
          nutrition: nutritionStats,
          mood: moodStats,
          sleep: sleepStats
        }
      }
    });

  } catch (error) {
    console.error('Progress report error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
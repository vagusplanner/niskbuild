import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period = 'weekly' } = await req.json();
    const daysBack = period === 'weekly' ? 7 : 30;

    // Fetch health data
    const [sleepData, nutritionData, exerciseData, moodData] = await Promise.all([
      base44.entities.Sleep.list('-date', daysBack * 2),
      base44.entities.Nutrition.list('-date', daysBack * 2),
      base44.entities.Exercise.list('-date', daysBack * 2),
      base44.entities.Mood.list('-date', daysBack * 2)
    ]);

    // Generate AI report
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive ${period} health report with insights and recommendations.

Sleep Data: ${JSON.stringify(sleepData.slice(0, 10).map(s => ({ date: s.date, hours: s.sleep_hours, quality: s.sleep_quality })))}

Nutrition Data: ${JSON.stringify(nutritionData.slice(0, 10).map(n => ({ date: n.date, meal_type: n.meal_type, calories: n.calories, protein: n.protein })))}

Exercise Data: ${JSON.stringify(exerciseData.slice(0, 10).map(e => ({ date: e.date, activity: e.activity_name, duration: e.duration_minutes, intensity: e.intensity })))}

Mood Data: ${JSON.stringify(moodData.slice(0, 10).map(m => ({ date: m.date, mood: m.mood_type, rating: m.mood_rating, stress: m.stress_level })))}

Please provide:
1. Executive summary of health status
2. Detailed analysis for each category (sleep, nutrition, exercise, mood)
3. Key correlations and patterns discovered
4. Specific health recommendations
5. Motivation and encouragement`,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          sleep_analysis: { type: 'string' },
          nutrition_analysis: { type: 'string' },
          exercise_analysis: { type: 'string' },
          mood_analysis: { type: 'string' },
          correlations: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          },
          motivation: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      period,
      report: response
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
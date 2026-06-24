import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode = 'analysis', focus_area } = await req.json();

    // Fetch comprehensive health data
    const [sleep, mood, exercise, nutrition, period, energy, healthGoals] = await Promise.all([
      base44.entities.Sleep.list('-date', 14),
      base44.entities.Mood.list('-date', 14),
      base44.entities.Exercise.list('-date', 14),
      base44.entities.Nutrition.list('-date', 14),
      base44.entities.Period.list('-date', 6),
      base44.entities.EnergyLog.list('-date', 14),
      base44.entities.Goal.filter({ category: 'health', status: 'active' })
    ]);

    // Calculate key metrics
    const avgSleep = sleep.length > 0 
      ? sleep.reduce((sum, s) => sum + (s.duration_hours || 0), 0) / sleep.length 
      : 0;
    const avgMood = mood.length > 0
      ? mood.reduce((sum, m) => sum + (m.mood_rating || 0), 0) / mood.length
      : 0;
    const weeklyExercise = exercise.length;
    const avgStress = mood.length > 0
      ? mood.reduce((sum, m) => sum + (m.stress_level || 0), 0) / mood.length
      : 0;

    if (mode === 'analysis') {
      // Generate comprehensive health analysis
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert AI Health Coach analyzing a user's comprehensive health data to provide personalized wellness guidance.

USER'S HEALTH GOALS:
${healthGoals.length > 0 ? healthGoals.map(g => `- ${g.title}: ${g.metadata?.current_value || 0}/${g.metadata?.target_value} ${g.metadata?.unit} (${Math.round(g.progress || 0)}% complete)`).join('\n') : 'No specific goals set yet'}

USER HEALTH DATA (Last 14 days):

SLEEP:
- Average: ${avgSleep.toFixed(1)} hours/night
- Recent patterns: ${sleep.slice(0, 5).map(s => `${s.date}: ${s.duration_hours}h (quality: ${s.quality || 'N/A'})`).join(', ')}

MOOD & MENTAL HEALTH:
- Average mood: ${avgMood.toFixed(1)}/10
- Average stress: ${avgStress.toFixed(1)}/10
- Recent moods: ${mood.slice(0, 5).map(m => `${m.date}: ${m.mood_type} (${m.mood_rating}/10)`).join(', ')}

EXERCISE:
- Weekly sessions: ${weeklyExercise}
- Recent activities: ${exercise.slice(0, 5).map(e => `${e.activity_type} - ${e.duration_minutes}min`).join(', ')}

NUTRITION:
- Meals logged: ${nutrition.length}
- Recent meals: ${nutrition.slice(0, 3).map(n => `${n.meal_type}: ${n.meal_name}`).join(', ')}

ENERGY LEVELS:
- Recent energy: ${energy.slice(0, 5).map(e => `${e.time_of_day}: ${e.energy_level}/10`).join(', ')}

${period.length > 0 ? `MENSTRUAL CYCLE:
- Last period: ${period[0]?.start_date}
- Cycle patterns tracked` : ''}

ANALYSIS TASK:
Provide a comprehensive, personalized health assessment with:
1. Overall wellness score (0-100)
2. Key strengths in their health routine
3. Top 3 areas needing improvement with specific reasons
4. Patterns and correlations you've identified
5. Personalized 7-day wellness plan SPECIFICALLY DESIGNED to help them achieve their health goals (if they have any)
6. 5 immediate health nudges tailored to their goals

Be empathetic, encouraging, and specific. Focus on sustainable changes. If they have specific goals, PRIORITIZE actions that directly contribute to achieving those goals.

Return as JSON:
{
  "wellness_score": 75,
  "summary": "Brief overall assessment",
  "strengths": ["strength1", "strength2"],
  "improvement_areas": [
    {
      "area": "Sleep",
      "current_status": "Current situation",
      "why_important": "Why this matters",
      "target": "Specific goal"
    }
  ],
  "patterns": ["pattern1", "pattern2"],
  "weekly_plan": [
    {
      "day": 1,
      "focus": "Focus area",
      "morning": "Morning routine",
      "afternoon": "Afternoon activity",
      "evening": "Evening routine",
      "goal": "Daily goal"
    }
  ],
  "immediate_nudges": [
    {
      "title": "Action title",
      "action": "Specific action to take",
      "why": "Benefit",
      "time": "When to do it"
    }
  ]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            wellness_score: { type: 'number' },
            summary: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            improvement_areas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: { type: 'string' },
                  current_status: { type: 'string' },
                  why_important: { type: 'string' },
                  target: { type: 'string' }
                }
              }
            },
            patterns: { type: 'array', items: { type: 'string' } },
            weekly_plan: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'number' },
                  focus: { type: 'string' },
                  morning: { type: 'string' },
                  afternoon: { type: 'string' },
                  evening: { type: 'string' },
                  goal: { type: 'string' }
                }
              }
            },
            immediate_nudges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  action: { type: 'string' },
                  why: { type: 'string' },
                  time: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json({
        success: true,
        analysis,
        generated_at: new Date().toISOString()
      });
    } else if (mode === 'quick_advice') {
      // Generate quick contextual advice
      const advice = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on user's recent health data, provide 3 quick, actionable health tips for ${focus_area || 'general wellness'}. Keep each tip under 20 words and make them specific to their current patterns.

Recent context:
- Sleep: ${avgSleep.toFixed(1)}h avg
- Mood: ${avgMood.toFixed(1)}/10
- Exercise: ${weeklyExercise} sessions
- Stress: ${avgStress.toFixed(1)}/10

Return array of tips as strings.`,
        response_json_schema: {
          type: 'object',
          properties: {
            tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      return Response.json({
        success: true,
        tips: advice.tips
      });
    }

    return Response.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
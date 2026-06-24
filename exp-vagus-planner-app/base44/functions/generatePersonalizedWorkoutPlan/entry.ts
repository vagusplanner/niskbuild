import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's exercise history and preferences
    const [exercises, settings, goals] = await Promise.all([
      base44.entities.Exercise.list('-created_date', 30),
      base44.entities.UserSettings.list(),
      base44.entities.Goal.filter({ category: 'health', status: { $in: ['in_progress', 'not_started'] } })
    ]);

    const userSettings = settings[0] || {};

    // Analyze exercise patterns
    const exerciseTypes = exercises.map(e => e.activity_type);
    const avgDuration = exercises.length > 0 
      ? exercises.reduce((acc, e) => acc + (e.duration || 0), 0) / exercises.length 
      : 30;
    const weeklyFrequency = exercises.filter(e => {
      const date = new Date(e.created_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length;

    const context = `
User Exercise Profile:
- Recent exercises (30 days): ${exercises.length} sessions
- Average duration: ${avgDuration.toFixed(0)} minutes
- Weekly frequency: ${weeklyFrequency} times/week
- Preferred activities: ${exerciseTypes.slice(0, 5).join(', ') || 'None logged yet'}
- Health goals: ${goals.map(g => g.title).join(', ') || 'Not specified'}
- Dietary preferences: ${userSettings.dietary_preferences?.join(', ') || 'None specified'}

Recent activity pattern:
${exercises.slice(0, 5).map(e => `- ${e.activity_type}: ${e.duration}min (${e.intensity || 'moderate'})`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert fitness coach. Create a personalized 7-day workout plan for this user.

${context}

Provide a workout plan in JSON format:
{
  "plan": {
    "overview": "Brief summary of the plan approach",
    "weekly_schedule": [
      {
        "day": "Monday",
        "workout_name": "Full Body Strength",
        "duration_minutes": 45,
        "exercises": [
          {
            "name": "Squats",
            "sets": 3,
            "reps": "12-15",
            "notes": "Focus on form"
          }
        ],
        "intensity": "moderate",
        "focus": "strength"
      }
    ],
    "tips": ["Tip 1", "Tip 2", "Tip 3"],
    "progression_notes": "How to progress this plan"
  }
}

Guidelines:
- Balance different muscle groups
- Include rest days
- Consider their current fitness level
- Make it achievable and progressive
- Include warmup and cooldown notes`,
      response_json_schema: {
        type: "object",
        properties: {
          plan: {
            type: "object",
            properties: {
              overview: { type: "string" },
              weekly_schedule: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    day: { type: "string" },
                    workout_name: { type: "string" },
                    duration_minutes: { type: "number" },
                    exercises: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          sets: { type: "number" },
                          reps: { type: "string" },
                          notes: { type: "string" }
                        }
                      }
                    },
                    intensity: { type: "string" },
                    focus: { type: "string" }
                  }
                }
              },
              tips: { type: "array", items: { type: "string" } },
              progression_notes: { type: "string" }
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
    console.error('Workout plan generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
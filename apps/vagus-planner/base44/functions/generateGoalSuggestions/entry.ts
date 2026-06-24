import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user data
    const [goals, tasks, events, health, settings] = await Promise.all([
      base44.entities.Goal.list('-created_date', 20),
      base44.entities.Task.list('-created_date', 50),
      base44.entities.Event.list('-start_date', 30),
      Promise.all([
        base44.entities.Exercise.list('-created_date', 14),
        base44.entities.Nutrition.list('-created_date', 14),
        base44.entities.Sleep.list('-created_date', 14)
      ]).then(([ex, nut, sleep]) => ({ exercise: ex, nutrition: nut, sleep })),
      base44.entities.UserSettings.list()
    ]);

    const userSettings = settings[0] || {};

    // Build context
    const context = `
User Profile:
- Current goals: ${goals.length} (${goals.filter(g => g.status === 'in_progress').length} in progress, ${goals.filter(g => g.status === 'completed').length} completed)
- Active tasks: ${tasks.filter(t => t.status !== 'completed').length}
- Recent events: ${events.length}
- Exercise frequency: ${health.exercise.length} sessions in 2 weeks
- Focus areas: ${userSettings.focus_areas?.join(', ') || 'Not specified'}
- Work style: ${userSettings.work_style || 'Not specified'}

Goal patterns:
${goals.slice(0, 5).map(g => `- ${g.title} (${g.category}, ${g.status})`).join('\n')}

Activity patterns:
- Calendar engagement: ${events.length > 20 ? 'High' : events.length > 10 ? 'Medium' : 'Low'}
- Task completion rate: ${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
- Health tracking: ${health.exercise.length > 7 ? 'Regular' : health.exercise.length > 3 ? 'Occasional' : 'Rare'}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a productivity and goal-setting coach. Based on this user's activity patterns and existing goals, suggest 3-5 new personalized goals they should consider.

${context}

Provide goal suggestions in JSON format:
{
  "suggestions": [
    {
      "title": "Goal title",
      "description": "Why this goal matters and how to achieve it",
      "category": "work|personal|health|spiritual|learning|family",
      "timeframe": "1 week|1 month|3 months|6 months|1 year",
      "difficulty": "easy|medium|challenging",
      "reasoning": "Why this is recommended based on their data"
    }
  ]
}

Focus on:
1. Filling gaps in their current goal categories
2. Building on their strengths and interests
3. Addressing any imbalances (e.g., all work, no personal goals)
4. Realistic and achievable based on their activity level
5. Aligned with their focus areas and work style`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                timeframe: { type: "string" },
                difficulty: { type: "string" },
                reasoning: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.suggestions || []
    });

  } catch (error) {
    console.error('Goal suggestions error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
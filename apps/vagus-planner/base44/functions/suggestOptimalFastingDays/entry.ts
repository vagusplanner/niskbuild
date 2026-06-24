import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, year, user_preferences = {}, fasting_history = [] } = await req.json();

    const suggestions = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on Islamic fasting practices and the user's preferences, suggest optimal fasting days for ${month}/${year}.

User Preferences:
- Fasting type: ${user_preferences.type || 'voluntary (Sunnah)'}
- Experience level: ${user_preferences.experience || 'intermediate'}
- Health status: ${user_preferences.health_status || 'good'}
- Work intensity: ${user_preferences.work_intensity || 'moderate'}
- Available fasting days this month: ${user_preferences.available_days || 'all weekdays'}

Recent fasting history (last 10 days):
${fasting_history.length > 0 ? fasting_history.map(h => `- ${h.date}: ${h.completed ? 'Completed' : 'Did not fast'}`).join('\n') : 'No history'}

Provide recommendations in JSON format:
{
  "month": "${month}",
  "year": ${year},
  "optimal_days": [
    {
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "priority": "high|medium|low",
      "reason": "why this day is optimal",
      "difficulty": "easy|moderate|challenging",
      "tips": ["specific tips for this day"],
      "Islamic_significance": "any Islamic significance if applicable"
    }
  ],
  "fasting_pattern": "suggested pattern (e.g., 'Monday & Thursday', 'alternate days')",
  "total_recommended": number,
  "streak_opportunity": "days to achieve a streak",
  "health_considerations": "health notes based on preferences",
  "motivational_insight": "encouraging message about the chosen days",
  "weekly_breakdown": {
    "week_1": ["dates"],
    "week_2": ["dates"],
    "week_3": ["dates"],
    "week_4": ["dates"]
  },
  "avoid_days": [
    {
      "date": "YYYY-MM-DD",
      "reason": "why to avoid"
    }
  ],
  "milestone_opportunities": ["potential milestones like 5-day streak, etc"]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          month: { type: "string" },
          year: { type: "number" },
          optimal_days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                day_name: { type: "string" },
                priority: { type: "string" },
                reason: { type: "string" },
                difficulty: { type: "string" },
                tips: { type: "array", items: { type: "string" } },
                Islamic_significance: { type: "string" }
              }
            }
          },
          fasting_pattern: { type: "string" },
          total_recommended: { type: "number" },
          streak_opportunity: { type: "string" },
          health_considerations: { type: "string" },
          motivational_insight: { type: "string" },
          weekly_breakdown: { type: "object" },
          avoid_days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                reason: { type: "string" }
              }
            }
          },
          milestone_opportunities: { type: "array", items: { type: "string" } }
        }
      },
      add_context_from_internet: true
    });

    return Response.json({
      month,
      year,
      ...suggestions,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fasting suggestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
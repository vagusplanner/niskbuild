import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { period = 'daily' } = await req.json();
    const daysToFetch = period === 'daily' ? 1 : 7;

    // Fetch comprehensive data
    const [
      events, tasks, goals, 
      nutrition, exercise, mood, sleep,
      prayers, habits, meetings
    ] = await Promise.all([
      base44.entities.Event.list('-start_date', daysToFetch * 50),
      base44.entities.Task.list('-created_date', daysToFetch * 50),
      base44.entities.Goal.list('-updated_date', 20),
      base44.entities.Nutrition.list('-created_date', daysToFetch),
      base44.entities.Exercise.list('-created_date', daysToFetch),
      base44.entities.Mood.list('-created_date', daysToFetch),
      base44.entities.Sleep.list('-created_date', daysToFetch),
      base44.entities.PrayerLog.list('-created_date', daysToFetch),
      base44.entities.HabitCompletion.list('-completion_date', daysToFetch * 20),
      base44.entities.Meeting.list('-created_date', daysToFetch * 10)
    ]);

    // Filter by period
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToFetch);

    const filterByDate = (items, dateField) => 
      items.filter(item => new Date(item[dateField]) >= startDate);

    const periodEvents = filterByDate(events, 'start_date');
    const periodTasks = filterByDate(tasks, 'created_date');
    const completedTasks = periodTasks.filter(t => t.status === 'completed');

    // Build comprehensive context
    const summaryContext = `
Time Period: ${period === 'daily' ? 'Today' : 'This Week'}

PRODUCTIVITY:
- Events attended: ${periodEvents.length}
- Tasks completed: ${completedTasks.length} of ${periodTasks.length}
- Meetings: ${meetings.filter(m => m.status === 'completed').length}
- Goals updated: ${goals.filter(g => new Date(g.updated_date) >= startDate).length}

HEALTH & WELLNESS:
- Exercise sessions: ${exercise.length} (total ${exercise.reduce((acc, e) => acc + (e.duration || 0), 0)} minutes)
- Meals logged: ${nutrition.length}
- Sleep average: ${sleep.length > 0 ? (sleep.reduce((acc, s) => acc + (s.hours_slept || 0), 0) / sleep.length).toFixed(1) : 'N/A'}h
- Mood average: ${mood.length > 0 ? (mood.reduce((acc, m) => acc + m.mood_rating, 0) / mood.length).toFixed(1) : 'N/A'}/10

SPIRITUAL:
- Prayers logged: ${prayers.length}
- Habit completions: ${habits.length}

HIGHLIGHTS:
${periodEvents.slice(0, 5).map(e => `- Event: ${e.title} (${e.category})`).join('\n')}
${completedTasks.slice(0, 5).map(t => `- Completed: ${t.title} (${t.priority} priority)`).join('\n')}
${exercise.slice(0, 3).map(e => `- Exercise: ${e.activity_type} (${e.duration}min)`).join('\n')}
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a personal wellness and productivity analyst. Generate a comprehensive ${period} summary for this user.

${summaryContext}

Provide a summary in JSON format:
{
  "summary": {
    "headline": "Brief engaging headline",
    "overview": "2-3 sentence summary of their ${period}",
    "highlights": ["Achievement 1", "Achievement 2", "Achievement 3"],
    "insights": [
      {
        "category": "productivity|health|balance|spiritual",
        "title": "Insight title",
        "description": "Specific observation",
        "sentiment": "positive|neutral|concern"
      }
    ],
    "recommendations": ["Action 1", "Action 2", "Action 3"],
    "score": {
      "productivity": 0-100,
      "health": 0-100,
      "balance": 0-100,
      "overall": 0-100
    }
  }
}

Focus on:
1. Celebrating achievements
2. Identifying patterns and trends
3. Offering actionable improvements
4. Maintaining a supportive, motivational tone`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              headline: { type: "string" },
              overview: { type: "string" },
              highlights: { type: "array", items: { type: "string" } },
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    sentiment: { type: "string" }
                  }
                }
              },
              recommendations: { type: "array", items: { type: "string" } },
              score: {
                type: "object",
                properties: {
                  productivity: { type: "number" },
                  health: { type: "number" },
                  balance: { type: "number" },
                  overall: { type: "number" }
                }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      data: response.summary || {}
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
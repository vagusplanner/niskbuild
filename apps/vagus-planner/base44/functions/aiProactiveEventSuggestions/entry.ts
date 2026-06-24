import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendar_events, user_preferences, hijri_date, user_goals } = await req.json();

    // Analyze user's calendar patterns and Islamic dates
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a smart Islamic calendar assistant. Analyze this user profile and suggest personalized events/tasks:

Current Hijri Date: ${hijri_date.day} ${hijri_date.monthName} ${hijri_date.year}
Recent Calendar: ${JSON.stringify(calendar_events.slice(0, 5).map(e => ({ title: e.title, date: e.start_date })))}
User Preferences: ${JSON.stringify(user_preferences || {})}
User Goals: ${JSON.stringify(user_goals || [])}

Generate 2-3 specific, actionable suggestions in concise JSON:
{
  "suggestions": [
    {
      "title": "Event title",
      "type": "task|event|reminder",
      "description": "1-2 sentence description",
      "reason": "Why this is relevant to user",
      "due_date": "YYYY-MM-DD if applicable",
      "priority": "high|medium|low",
      "is_islamic": true/false
    }
  ]
}

Be specific. Base suggestions on actual Islamic calendar, user's calendar gaps, and stated goals.`,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                type: { type: 'string' },
                description: { type: 'string' },
                reason: { type: 'string' },
                due_date: { type: 'string' },
                priority: { type: 'string' },
                is_islamic: { type: 'boolean' }
              }
            }
          }
        }
      }
    });

    return Response.json({
      success: true,
      suggestions: response.suggestions || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
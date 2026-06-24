import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendar_events, health_events, personal_milestones, user_preferences } = await req.json();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Suggest meaningful Sadaqah (voluntary charity) opportunities for a Muslim based on their life:

Upcoming Calendar Events:
${calendar_events?.slice(0, 5).map(e => `- ${e.title} on ${e.start_date}`).join('\n') || 'None'}

Health/Personal Events:
${health_events?.length > 0 ? health_events.map(e => `- ${e.type}: ${e.description}`).join('\n') : 'None'}

Milestones/Achievements:
${personal_milestones?.length > 0 ? personal_milestones.map(m => `- ${m.title}`).join('\n') : 'None'}

User Preferences:
${user_preferences ? JSON.stringify(user_preferences) : 'None'}

Generate Sadaqah opportunities in JSON. Each opportunity should:
- Connect to their actual life events
- Be actionable and specific
- Include both monetary and non-monetary options
- Align with Islamic principles

{
  "opportunities": [
    {
      "title": "Opportunity title",
      "description": "What to do",
      "type": "monetary|non_monetary|time",
      "suggested_amount": number,
      "best_time": "when to do this",
      "category": "mosque|orphans|poor|education|healthcare|animal_welfare|general",
      "connection": "How this relates to their life/events",
      "reward": "Islamic principle or benefit",
      "implementation": "How to do it"
    }
  ],
  "daily_habits": [
    {
      "habit": "Daily Sadaqah habit",
      "impact": "Spiritual and social impact",
      "effort": "low|medium|high"
    }
  ],
  "current_month_focus": "Recommended focus area for this month based on Islamic calendar"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string' },
                suggested_amount: { type: 'number' },
                best_time: { type: 'string' },
                category: { type: 'string' },
                connection: { type: 'string' },
                reward: { type: 'string' },
                implementation: { type: 'string' }
              }
            }
          },
          daily_habits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                habit: { type: 'string' },
                impact: { type: 'string' },
                effort: { type: 'string' }
              }
            }
          },
          current_month_focus: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      data: response
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
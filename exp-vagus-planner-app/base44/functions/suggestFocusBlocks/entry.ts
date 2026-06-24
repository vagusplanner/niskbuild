import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Suggest optimal focus time blocks based on schedule and energy patterns
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'focus_blocks_suggestion' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ error: usageCheck.data.message, limit_exceeded: true }, { status: 403 });
    }

    const { days = 7 } = await req.json().catch(() => ({}));
    
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

    const [events, tasks, settings] = await Promise.all([
      base44.entities.Event.list('-start_date', 100),
      base44.entities.Task.filter({ status: ['todo', 'in_progress'] }),
      base44.entities.UserSettings.list()
    ]);

    const upcomingEvents = events.filter(e => 
      e.start_date >= startDate && e.start_date <= endDate
    );

    const deepWorkTasks = tasks.filter(t => 
      t.estimated_minutes >= 60 || t.priority === 'high' || t.priority === 'urgent'
    );

    const workStyle = settings[0]?.work_style || 'flexible';

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Suggest optimal focus blocks for the next ${days} days.

**Work Style:** ${workStyle}
**Upcoming Events:** ${upcomingEvents.length}
${upcomingEvents.slice(0, 5).map(e => `- ${e.title} on ${e.start_date}`).join('\n')}

**Deep Work Tasks:** ${deepWorkTasks.length}
${deepWorkTasks.slice(0, 5).map(t => `- ${t.title} (${t.estimated_minutes} min, ${t.priority})`).join('\n')}

Suggest:
1. Ideal focus block times (2-4 hour blocks)
2. Best days/times based on schedule density
3. Task-to-block matching
4. Energy optimization tips`,
      response_json_schema: {
        type: "object",
        properties: {
          focus_blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                start_time: { type: "string" },
                end_time: { type: "string" },
                duration_hours: { type: "number" },
                recommended_tasks: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" },
                energy_level: { type: "string", enum: ["high", "medium", "low"] }
              }
            }
          },
          general_tips: { type: "array", items: { type: "string" } },
          best_focus_days: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      period_days: days,
      ...response
    });

  } catch (error) {
    console.error('Focus blocks suggestion error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});
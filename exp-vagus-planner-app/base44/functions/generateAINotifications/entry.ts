import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's context
    const [events, goals, tasks, settings, preferences] = await Promise.all([
      base44.entities.Event.list('-start_date', 10),
      base44.entities.LifeGoal.list('-created_date', 10),
      base44.entities.Task.list('-due_date', 20),
      base44.entities.UserSettings.list(),
      base44.entities.NotificationPreference.list()
    ]);

    const userSettings = settings[0] || {};
    const islamicMode = userSettings.islamic_mode || false;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Build AI context
    const upcomingEvents = events.filter(e => e.start_date >= today).slice(0, 5);
    const activeGoals = goals.filter(g => g.status === 'in_progress').slice(0, 5);
    const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.priority === 'high').slice(0, 5);

    const context = `
You are an intelligent notification assistant for Vagus Planner.

USER CONTEXT:
- Name: ${user.full_name || user.email}
- Islamic Mode: ${islamicMode ? 'Enabled' : 'Disabled'}
- Current Date: ${today}

UPCOMING EVENTS (next 5):
${upcomingEvents.map(e => `- ${e.title} on ${e.start_date} at ${e.start_date}`).join('\n') || 'None'}

ACTIVE GOALS (in progress):
${activeGoals.map(g => `- ${g.title} (${g.progress_percentage}% complete, category: ${g.category})`).join('\n') || 'None'}

URGENT TASKS:
${urgentTasks.map(t => `- ${t.title} (due: ${t.due_date || 'no deadline'})`).join('\n') || 'None'}

TASK:
Generate 3-5 contextual, time-sensitive notifications for the next 24 hours that will help the user:
1. Stay on track with their goals
2. Prepare for upcoming events
3. Complete urgent tasks
4. Maintain work-life balance
5. If Islamic mode is enabled, include prayer-related reminders

Each notification should be:
- Actionable and specific
- Time-sensitive (scheduled for optimal times)
- Personalized to the user's context
- Motivating and supportive

Return ONLY valid JSON array.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: context,
      response_json_schema: {
        type: "object",
        properties: {
          notifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                message: { type: "string" },
                type: { type: "string" },
                priority: { type: "string" },
                scheduled_time: { type: "string" },
                delivery_channel: { type: "string" }
              }
            }
          }
        }
      }
    });

    const aiNotifications = response.notifications || [];
    const created = [];

    for (const notif of aiNotifications) {
      // Check user preferences
      const pref = preferences.find(p => p.notification_type === notif.type);
      if (pref && pref.enabled === false) continue;

      const notification = await base44.entities.SmartNotification.create({
        ...notif,
        ai_generated: true,
        status: 'pending',
        created_by: user.email
      });
      created.push(notification);
    }

    return Response.json({
      success: true,
      generated: created.length,
      notifications: created
    });

  } catch (error) {
    console.error('Error generating AI notifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate AI-powered daily briefing with priorities and recommendations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Detect if called from a scheduled automation (no user session)
    const isScheduled = !(await base44.auth.isAuthenticated());

    // For scheduled runs, generate briefings for all users
    if (isScheduled) {
      const now = new Date();
      const currentHour = now.getUTCHours();
      // morning = before noon UTC, evening = noon or after
      const briefingType = currentHour < 12 ? 'morning' : 'evening';

      const users = await base44.asServiceRole.entities.User.list();
      const results = [];

      for (const user of users) {
        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

        const [tasks, events, goals, habits, prayerLogs, notifications, settings] = await Promise.all([
          base44.asServiceRole.entities.Task.filter({ created_by: user.email }, '-priority', 100),
          base44.asServiceRole.entities.Event.filter({ created_by: user.email }, '-start_date', 50),
          base44.asServiceRole.entities.Goal.filter({ status: 'in_progress', created_by: user.email }),
          base44.asServiceRole.entities.Habit.filter({ is_active: true, created_by: user.email }),
          base44.asServiceRole.entities.PrayerLog.filter({ date: today, created_by: user.email }),
          base44.asServiceRole.entities.Notification.filter({ is_read: false, created_by: user.email }, '-created_date', 10),
          base44.asServiceRole.entities.UserSettings.filter({ created_by: user.email })
        ]);

        const userSettings = settings[0] || {};
        if (userSettings.notifications_enabled === false) continue;

        const todayTasks = tasks.filter(t => t.due_date === today && t.status !== 'completed');
        const overdueTasks = tasks.filter(t => t.due_date < today && t.status !== 'completed');
        const todayEvents = events.filter(e => e.start_date?.startsWith(today));
        const tomorrowEvents = events.filter(e => e.start_date?.startsWith(tomorrow));

        const summaryPrefix = briefingType === 'morning' ? 'Morning briefing' : 'Evening briefing';
        const summaryBody = briefingType === 'morning'
          ? `${todayTasks.length} tasks and ${todayEvents.length} events scheduled today. ${overdueTasks.length} overdue.`
          : `${todayTasks.length} tasks today, ${tomorrowEvents.length} events tomorrow. ${overdueTasks.length} overdue.`;

        // Save a DailyBriefing record for this user
        await base44.asServiceRole.entities.DailyBriefing.create({
          date: today,
          type: briefingType,
          summary: `${summaryPrefix}: ${summaryBody}`,
          events_count: todayEvents.length,
          tasks_count: todayTasks.length,
          sent_at: now.toISOString(),
          created_by: user.email
        });

        results.push(user.email);
      }

      return Response.json({ success: true, briefing_type: briefingType, briefings_sent: results.length, users: results });
    }

    // Direct call with authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Track usage
    const usageCheck = await base44.functions.invoke('trackUsage', {
      feature_type: 'ai_requests',
      amount: 1,
      metadata: { action: 'daily_briefing' }
    });

    if (!usageCheck.data.allowed) {
      return Response.json({ error: usageCheck.data.message, limit_exceeded: true }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Fetch today's data
    const [tasks, events, goals, habits, prayerLogs, notifications, settings] = await Promise.all([
      base44.entities.Task.list('-priority', 100),
      base44.entities.Event.list('-start_date', 50),
      base44.entities.Goal.filter({ status: 'in_progress' }),
      base44.entities.Habit.filter({ is_active: true }),
      base44.entities.PrayerLog.filter({ date: today }),
      base44.entities.Notification.filter({ is_read: false }, '-created_date', 10),
      base44.entities.UserSettings.list()
    ]);

    const todayTasks = tasks.filter(t => t.due_date === today && t.status !== 'completed');
    const overdueTasks = tasks.filter(t => t.due_date < today && t.status !== 'completed');
    const todayEvents = events.filter(e => e.start_date?.startsWith(today));
    const tomorrowEvents = events.filter(e => e.start_date?.startsWith(tomorrow));
    const prayerEvents = todayEvents.filter(e => e.category === 'prayer');
    const prayersCompleted = prayerLogs.length;
    const userSettings = settings[0] || {};

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive daily briefing for ${today} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}). User timezone: ${userSettings.timezone || 'UTC'}. Analyze this data:

**Overdue Tasks (${overdueTasks.length}):**
${overdueTasks.slice(0, 5).map(t => `- ${t.title} (${t.priority} priority, due ${t.due_date})`).join('\n') || 'None'}

**Today's Tasks (${todayTasks.length}):**
${todayTasks.slice(0, 10).map(t => `- ${t.title} (${t.priority} priority, ${t.estimated_minutes || '?'} min)`).join('\n') || 'No tasks scheduled'}

**Today's Events (${todayEvents.length}):**
${todayEvents.map(e => `- ${e.title} at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${e.category})`).join('\n') || 'No events scheduled'}

**Prayer Times Today (${prayerEvents.length} scheduled, ${prayersCompleted}/5 logged):**
${prayerEvents.map(e => `- ${e.title} at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`).join('\n') || 'Prayer times not configured'}

**Important Notifications (${notifications.length} unread):**
${notifications.slice(0, 5).map(n => `- ${n.message}`).join('\n') || 'None'}

**Tomorrow's Events (${tomorrowEvents.length}):**
${tomorrowEvents.slice(0, 3).map(e => `- ${e.title} at ${new Date(e.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`).join('\n') || 'Nothing scheduled'}

**Active Goals (${goals.length}):**
${goals.slice(0, 3).map(g => `- ${g.title} (${g.progress}% complete)`).join('\n') || 'No active goals'}

**Active Habits (${habits.length}):**
${habits.slice(0, 3).map(h => `- ${h.name}`).join('\n') || 'No active habits'}

Provide:
1. A friendly, personalized greeting considering the time and day
2. Day overview with key highlights and Islamic context (if applicable)
3. Top 3-5 priorities for today with specific tasks/events
4. Islamic reminders (prayer times not yet logged, fasting if applicable, duas for the day)
5. Schedule conflicts or time management issues
6. Quick wins (easy tasks to boost momentum)
7. Energy management tips based on schedule density
8. Key notifications requiring attention
9. Evening prep suggestions for tomorrow`,
      response_json_schema: {
        type: "object",
        properties: {
          greeting: { type: "string" },
          day_overview: { type: "string" },
          top_priorities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                reason: { type: "string" },
                suggested_time: { type: "string" }
              }
            }
          },
          conflicts: {
            type: "array",
            items: { type: "string" }
          },
          quick_wins: {
            type: "array",
            items: { type: "string" }
          },
          energy_tips: {
            type: "array",
            items: { type: "string" }
          },
          evening_prep: {
            type: "array",
            items: { type: "string" }
          },
          islamic_reminders: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                message: { type: "string" },
                type: { type: "string" }
              }
            }
          },
          key_notifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                message: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          focus_score: { type: "number" },
          workload_assessment: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      date: today,
      stats: {
        overdue_tasks: overdueTasks.length,
        today_tasks: todayTasks.length,
        today_events: todayEvents.length,
        active_goals: goals.length,
        prayers_completed: prayersCompleted,
        unread_notifications: notifications.length,
        active_habits: habits.length
      },
      ...response
    });

  } catch (error) {
    console.error('Daily briefing error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});
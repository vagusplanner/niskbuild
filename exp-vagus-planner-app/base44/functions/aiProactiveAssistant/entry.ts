import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users for scheduled automation
    const allUsers = await base44.asServiceRole.entities.User.list();
    const results = [];

    for (const user of allUsers) {
      try {
        // Fetch comprehensive user data
        const [events, tasks, goals, prayers, health, ramadan] = await Promise.all([
          base44.asServiceRole.entities.Event.filter({ created_by: user.email }, '-start_date', 20),
          base44.asServiceRole.entities.Task.filter({ status: 'todo', created_by: user.email }),
          base44.asServiceRole.entities.Goal.filter({ status: 'active', created_by: user.email }),
          base44.asServiceRole.entities.PrayerLog.filter({ created_by: user.email }, '-created_date', 7),
          base44.asServiceRole.entities.Mood.filter({ created_by: user.email }, '-date', 5),
          base44.asServiceRole.entities.RamadanGoal.filter({ status: 'active', created_by: user.email })
        ]);

    // Analyze user patterns and generate proactive insights
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI assistant analyzing a user's activity to provide proactive, helpful notifications and suggestions.

User Data Summary:
- Upcoming Events (next 7 days): ${events.slice(0, 7).map(e => `${e.title} on ${e.start_date || 'TBD'}`).join(', ') || 'None'}
- Pending Tasks: ${tasks.length} tasks (${tasks.slice(0, 3).map(t => t.title).join(', ') || 'None'})
- Active Goals: ${goals.map(g => `${g.title} (${g.progress || 0}% complete)`).join(', ') || 'None'}
- Recent Prayer Tracking: ${prayers.length} prayers logged this week
- Recent Mood: ${health.length > 0 ? health[0].mood_type : 'Unknown'}
- Ramadan Goals: ${ramadan.length} active

Analyze this data and generate 3-5 proactive notifications/suggestions that would be genuinely helpful RIGHT NOW. Consider:
1. Upcoming deadlines or events that need preparation
2. Goals that haven't been updated recently
3. Missed habits or routines
4. Opportunities for improvement
5. Encouragement for progress made

Return as JSON:
{
  "notifications": [
    {
      "title": "Brief notification title",
      "message": "Clear, actionable message",
      "type": "reminder|suggestion|encouragement|alert",
      "priority": "high|normal|low",
      "action_url": "optional page URL"
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          notifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                message: { type: 'string' },
                type: { type: 'string' },
                priority: { type: 'string' },
                action_url: { type: 'string' }
              }
            }
          }
        }
      }
    });

        // Send top 3 notifications
        const topNotifications = analysis.notifications.slice(0, 3);
        const created = [];

        for (const notif of topNotifications) {
          const result = await base44.asServiceRole.entities.Notification.create({
            user_email: user.email,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            priority: notif.priority,
            is_read: false,
            action_url: notif.action_url || null
          });
          created.push(result);
        }

        results.push({
          user: user.email,
          success: true,
          notifications_created: created.length
        });
      } catch (userError) {
        results.push({
          user: user.email,
          success: false,
          error: userError.message
        });
      }
    }

    return Response.json({
      success: true,
      users_processed: results.length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
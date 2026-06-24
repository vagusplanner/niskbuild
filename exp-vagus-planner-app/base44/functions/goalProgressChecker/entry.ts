import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * goalProgressChecker
 *
 * Runs on a schedule (daily). For every active goal belonging to any user:
 *  1. Calculates expected progress based on elapsed time vs target_date.
 *  2. If actual progress < expected progress by >15%, the goal is "behind".
 *  3. Uses LLM to generate a personalised check-in message.
 *  4. Creates a Notification record for the user.
 *  5. Creates a 15-minute "catch-up" Event block in their calendar for tomorrow morning.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only guard (scheduled calls come without a user token — allow service role)
    // If invoked by a real user, they must be admin
    let callerIsAdmin = false;
    try {
      const user = await base44.auth.me();
      callerIsAdmin = user?.role === 'admin';
    } catch {
      // No user token — assume scheduled/service invocation
      callerIsAdmin = true;
    }

    if (!callerIsAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Fetch all in-progress goals across all users
    const goals = await base44.asServiceRole.entities.Goal.filter({ status: 'in_progress' });

    if (!goals.length) {
      return Response.json({ message: 'No in-progress goals found', processed: 0 });
    }

    let notificationsCreated = 0;
    let eventsCreated = 0;
    const results = [];

    for (const goal of goals) {
      // Skip goals with no target date
      if (!goal.target_date) continue;

      const targetDate = new Date(goal.target_date);
      if (isNaN(targetDate.getTime())) continue;

      // Skip already-past goals
      if (targetDate < today) continue;

      // Calculate expected progress % based on time elapsed since creation
      const createdDate = new Date(goal.created_date);
      const totalDuration = targetDate.getTime() - createdDate.getTime();
      const elapsed = today.getTime() - createdDate.getTime();
      const expectedProgress = totalDuration > 0
        ? Math.min(100, Math.round((elapsed / totalDuration) * 100))
        : 0;

      const actualProgress = goal.progress || 0;
      const gap = expectedProgress - actualProgress;

      // Only act if behind by more than 15 percentage points
      if (gap <= 15) continue;

      const ownerEmail = goal.created_by;
      if (!ownerEmail) continue;

      console.log(`Goal "${goal.title}" (${ownerEmail}): expected ${expectedProgress}%, actual ${actualProgress}% — gap ${gap}%`);

      // --- 1. Generate AI check-in message ---
      let aiMessage = '';
      let aiTitle = '';
      try {
        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a supportive life coach. A user has a goal called "${goal.title}" (category: ${goal.category}, priority: ${goal.priority}).
Their target date is ${goal.target_date}. They should be at ${expectedProgress}% progress but are only at ${actualProgress}%.
${goal.description ? `Goal description: ${goal.description}` : ''}
${goal.action_steps?.length ? `Action steps: ${goal.action_steps.map(s => s.title).join(', ')}` : ''}

Write:
1. A short, warm, motivating check-in notification TITLE (max 8 words, no quotes).
2. A 2-sentence check-in MESSAGE that acknowledges their progress, names the specific gap, and encourages a small concrete next step today.

Be warm, not pushy. Don't use generic phrases like "You've got this!".`,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              message: { type: 'string' }
            }
          }
        });
        aiTitle = aiResult.title || `Check-in: ${goal.title}`;
        aiMessage = aiResult.message || `You're ${gap}% behind on "${goal.title}". A quick 15-minute catch-up has been added to your calendar for tomorrow.`;
      } catch (err) {
        console.error('LLM call failed:', err.message);
        aiTitle = `Check-in: ${goal.title}`;
        aiMessage = `You're ${gap}% behind schedule on "${goal.title}". We've blocked 15 minutes tomorrow to help you catch up.`;
      }

      // --- 2. Create Notification ---
      try {
        await base44.asServiceRole.entities.Notification.create({
          type: 'personalized_reminder',
          title: aiTitle,
          message: aiMessage,
          priority: gap > 30 ? 'high' : 'medium',
          icon: '🎯',
          action_url: '/Goals',
          action_data: { goal_id: goal.id, goal_title: goal.title, expected_progress: expectedProgress, actual_progress: actualProgress },
          scheduled_time: new Date().toISOString(),
          sent_time: new Date().toISOString(),
          is_read: false,
          dismissed: false,
          ai_generated: true,
          sound_enabled: true,
          created_by: ownerEmail
        });
        notificationsCreated++;
      } catch (err) {
        console.error('Failed to create notification:', err.message);
      }

      // --- 3. Create 15-min catch-up calendar block for tomorrow at 9am ---
      try {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const catchupEnd = new Date(tomorrow);
        catchupEnd.setMinutes(catchupEnd.getMinutes() + 15);

        await base44.asServiceRole.entities.Event.create({
          title: `🎯 Catch-up: ${goal.title}`,
          description: `Auto-scheduled 15-min catch-up block.\n\n${aiMessage}\n\nCurrent progress: ${actualProgress}% (target: ${expectedProgress}%)`,
          start_date: tomorrow.toISOString(),
          end_date: catchupEnd.toISOString(),
          is_all_day: false,
          category: goal.category === 'spiritual' ? 'personal' : (goal.category || 'personal'),
          color: '#f59e0b',
          source: 'app',
          created_by: ownerEmail
        });
        eventsCreated++;
      } catch (err) {
        console.error('Failed to create catch-up event:', err.message);
      }

      results.push({
        goal_id: goal.id,
        goal_title: goal.title,
        owner: ownerEmail,
        expected_progress: expectedProgress,
        actual_progress: actualProgress,
        gap,
        notification_title: aiTitle
      });
    }

    return Response.json({
      message: 'Goal progress check complete',
      goals_checked: goals.length,
      goals_behind: results.length,
      notifications_created: notificationsCreated,
      catchup_events_created: eventsCreated,
      details: results
    });

  } catch (error) {
    console.error('goalProgressChecker error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
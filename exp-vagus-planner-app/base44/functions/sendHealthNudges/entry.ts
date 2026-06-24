import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users for scheduled automation
    const allUsers = await base44.asServiceRole.entities.User.list();
    const results = [];

    for (const user of allUsers) {
      try {
        // Fetch recent health data for this user
        const [sleep, mood, exercise] = await Promise.all([
          base44.asServiceRole.entities.Sleep.filter({ created_by: user.email }, '-date', 7),
          base44.asServiceRole.entities.Mood.filter({ created_by: user.email }, '-date', 3),
          base44.asServiceRole.entities.Exercise.filter({ created_by: user.email }, '-date', 7)
        ]);

        // Determine what nudges to send
        const nudges = [];

        // Sleep nudge
        const avgSleep = sleep.length > 0
          ? sleep.reduce((sum, s) => sum + (s.duration_hours || 0), 0) / sleep.length
          : 0;
        
        if (avgSleep < 7 && sleep.length > 0) {
          nudges.push({
            title: '💤 Sleep Alert',
            message: `You've averaged ${avgSleep.toFixed(1)} hours of sleep this week. Aim for 7-9 hours tonight for better energy and focus.`,
            type: 'health_tip',
            priority: 'high'
          });
        }

        // Exercise nudge
        if (exercise.length < 3) {
          nudges.push({
            title: '🏃 Movement Reminder',
            message: `Only ${exercise.length} workouts this week. Even a 15-minute walk can boost your mood and energy!`,
            type: 'health_tip',
            priority: 'normal'
          });
        }

        // Mood check-in
        const recentMoods = mood.slice(0, 3);
        const lowMoods = recentMoods.filter(m => m.mood_rating < 5).length;
        
        if (lowMoods >= 2) {
          nudges.push({
            title: '🌟 Wellness Check',
            message: "We noticed you've been feeling down. Try a quick gratitude practice or reach out to someone you care about today.",
            type: 'mental_health',
            priority: 'high'
          });
        }

        // Hydration reminder (time-based)
        const hour = new Date().getHours();
        if (hour >= 10 && hour <= 18) {
          nudges.push({
            title: '💧 Hydration Time',
            message: 'Quick reminder to drink some water! Staying hydrated improves energy and focus.',
            type: 'health_tip',
            priority: 'low'
          });
        }

        // Send top 2 nudges
        const created = [];
        for (const nudge of nudges.slice(0, 2)) {
          const notification = await base44.asServiceRole.entities.Notification.create({
            user_email: user.email,
            title: nudge.title,
            message: nudge.message,
            type: nudge.type,
            priority: nudge.priority,
            is_read: false
          });
          created.push(notification);
        }
        
        results.push({
          user: user.email,
          success: true,
          nudges_sent: created.length
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
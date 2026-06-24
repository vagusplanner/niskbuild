import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const today = now.toISOString().split('T')[0];
    
    // Get all active Quran goals with reminders enabled
    const goals = await base44.asServiceRole.entities.QuranGoal.filter({
      status: 'active',
      reminder_enabled: true
    });
    
    const reminders = [];
    
    for (const goal of goals) {
      const userEmail = goal.created_by;
      if (!userEmail || !goal.reminder_time) continue;
      
      // Check if it's time for reminder (within 5-minute window)
      const reminderHour = parseInt(goal.reminder_time.split(':')[0]);
      const reminderMinute = parseInt(goal.reminder_time.split(':')[1]);
      if (now.getHours() !== reminderHour || Math.abs(now.getMinutes() - reminderMinute) > 5) continue;
      
      // Check if reminder already sent today
      const existingNotification = await base44.asServiceRole.entities.Notification.filter({
        recipient_email: userEmail,
        type: 'system',
        title: '📖 Quran Reading Reminder',
        created_date: { $gte: new Date(today).toISOString() }
      });
      
      if (existingNotification.length > 0) continue; // Already sent today
      
      // Check if user already read today
      const todayReadings = await base44.asServiceRole.entities.QuranReading.filter({
        created_by: userEmail,
        date: today
      });
      
      const todayVerses = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);
      const goalMet = todayVerses >= (goal.target_verses_per_day || 1);
      
      if (goalMet) continue; // Already met goal today
      
      try {
        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: userEmail,
          type: 'system',
          title: '📖 Quran Reading Reminder',
          message: `Time for your daily Quran reading. Goal: ${goal.target_verses_per_day} verses (${todayVerses} read today)`,
          priority: 'normal',
          metadata: {
            goal_id: goal.id,
            verses_remaining: (goal.target_verses_per_day || 0) - todayVerses
          }
        });
        
        // Send email reminder
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: userEmail,
          subject: '📖 Daily Quran Reading Reminder',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 32px;">📖 Time to Read</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">Assalamu Alaikum,</p>
                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                  It's time for your daily Quran reading session.
                </p>
                <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
                  <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 18px;">Your Goal: ${goal.title}</h3>
                  <div style="display: flex; justify-content: space-around; margin: 20px 0;">
                    <div style="text-align: center;">
                      <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 0;">${todayVerses}</p>
                      <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Read Today</p>
                    </div>
                    <div style="text-align: center;">
                      <p style="font-size: 32px; font-weight: bold; color: #f59e0b; margin: 0;">${goal.streak || 0}</p>
                      <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Day Streak</p>
                    </div>
                    <div style="text-align: center;">
                      <p style="font-size: 32px; font-weight: bold; color: #3b82f6; margin: 0;">${(goal.target_verses_per_day || 0) - todayVerses}</p>
                      <p style="font-size: 12px; color: #6b7280; margin: 5px 0 0 0;">Remaining</p>
                    </div>
                  </div>
                </div>
                ${goal.current_surah ? `
                  <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                      📍 <strong>Continue from:</strong> Surah ${goal.current_surah}, Verse ${goal.current_verse}
                    </p>
                  </div>
                ` : ''}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://quranly.com" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Open Quranly App
                  </a>
                </div>
                <p style="font-size: 14px; color: #6b7280; font-style: italic; margin-top: 20px;">
                  "And We have certainly made the Qur'an easy for remembrance, so is there any who will remember?" - Quran 54:17
                </p>
              </div>
              <div style="background: #e5e7eb; padding: 20px; text-align: center;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  Total verses read: ${goal.total_verses_read || 0} | Best streak: ${goal.best_streak || 0} days
                </p>
              </div>
            </div>
          `
        });
        
        reminders.push({
          user: userEmail,
          goal: goal.title,
          verses_remaining: (goal.target_verses_per_day || 0) - todayVerses
        });
      } catch (error) {
        console.error(`Failed to send Quran reminder to ${userEmail}:`, error);
      }
    }
    
    return Response.json({
      message: 'Quran reading reminders sent',
      reminders_sent: reminders.length,
      details: reminders
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
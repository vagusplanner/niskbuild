import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayOfWeek = tomorrow.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get all active users with settings
    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const notifications = [];
    
    for (const settings of allSettings) {
      const userEmail = settings.created_by;
      if (!userEmail) continue;
      
      // Check if user has any active fasting goals
      const activeGoals = await base44.asServiceRole.entities.FastingGoal.filter({
        created_by: userEmail,
        status: 'active',
        reminder_enabled: true
      });
      
      if (activeGoals.length === 0) continue;
      
      // Calculate hijri date for tomorrow
      const hijriDate = await getHijriDate(tomorrow);
      
      let shouldNotify = false;
      let fastingTypes = [];
      
      // Check for Monday/Thursday
      if (dayOfWeek === 1 || dayOfWeek === 4) {
        const hasMonThuGoal = activeGoals.some(g => g.type === 'mondayThursday');
        if (hasMonThuGoal) {
          shouldNotify = true;
          fastingTypes.push(`🔵 ${dayOfWeek === 1 ? 'Monday' : 'Thursday'} (Sunnah)`);
        }
      }
      
      // Check for White Days (13, 14, 15 of Hijri month)
      if (hijriDate && (hijriDate.day === 13 || hijriDate.day === 14 || hijriDate.day === 15)) {
        const hasWhiteDaysGoal = activeGoals.some(g => g.type === 'whiteDays');
        if (hasWhiteDaysGoal) {
          shouldNotify = true;
          fastingTypes.push(`🟣 White Day (${hijriDate.day} ${hijriDate.monthName})`);
        }
      }
      
      // Check for Ramadan (Hijri month 9)
      if (hijriDate && hijriDate.month === 9) {
        shouldNotify = true;
        fastingTypes.push(`🟢 Ramadan (${hijriDate.day} Ramadan)`);
      }
      
      // Send notification if should fast tomorrow
      if (shouldNotify) {
        const goal = activeGoals[0];
        const dateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        
        try {
          // Create notification in app
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: userEmail,
            type: 'system',
            title: '🌙 Fasting Day Tomorrow',
            message: `Tomorrow (${dateStr}) is a recommended fasting day: ${fastingTypes.join(', ')}`,
            priority: 'normal',
            metadata: {
              fasting_date: tomorrowStr,
              fasting_types: fastingTypes
            }
          });
          
          // Send email notification
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: '🌙 Fasting Reminder - Tomorrow',
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🌙 Fasting Day Tomorrow</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">Assalamu Alaikum,</p>
                  <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                    Tomorrow is a recommended fasting day:
                  </p>
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                    <p style="font-size: 18px; color: #8b5cf6; font-weight: bold; margin-bottom: 10px;">
                      📅 ${dateStr}
                    </p>
                    ${fastingTypes.map(type => `<p style="margin: 8px 0; font-size: 15px; color: #374151;">${type}</p>`).join('')}
                  </div>
                  <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      💡 <strong>Tip:</strong> Make your intention tonight and prepare for suhoor. 
                      ${goal.suhoor_reminder_time ? `We'll remind you at ${goal.suhoor_reminder_time}.` : ''}
                    </p>
                  </div>
                  <p style="font-size: 14px; color: #6b7280; font-style: italic; margin-top: 20px;">
                    "The Prophet (ﷺ) used to fast on Mondays and Thursdays." - Sahih al-Bukhari
                  </p>
                  <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                    May Allah accept your fasting and reward you abundantly. 🤲
                  </p>
                </div>
                <div style="background: #e5e7eb; padding: 20px; text-align: center;">
                  <p style="font-size: 12px; color: #6b7280; margin: 0;">
                    Your Fasting Goal: ${goal.title} (${goal.current_count}/${goal.target_count} completed)
                  </p>
                </div>
              </div>
            `
          });
          
          // Auto-create fasting record for tomorrow
          await base44.asServiceRole.entities.FastingRecord.create({
            created_by: userEmail,
            date: tomorrowStr,
            type: hijriDate?.month === 9 ? 'ramadan' : 
                  dayOfWeek === 1 || dayOfWeek === 4 ? 'mondayThursday' : 
                  'whiteDays',
            completed: false,
            intention_set: false
          });
          
          // Auto-create calendar event for fasting day
          const fastingType = hijriDate?.month === 9 ? 'Ramadan' : 
                             dayOfWeek === 1 || dayOfWeek === 4 ? 'Monday/Thursday Sunnah' : 
                             'White Days';
          
          await base44.asServiceRole.entities.Event.create({
            created_by: userEmail,
            title: `🌙 ${fastingType} Fasting`,
            description: `Fasting day - ${fastingTypes.join(', ')}`,
            date: tomorrowStr,
            all_day: true,
            category: 'spiritual',
            color: hijriDate?.month === 9 ? '#10b981' : 
                   dayOfWeek === 1 || dayOfWeek === 4 ? '#3b82f6' : '#8b5cf6'
          });
          
          notifications.push({
            user: userEmail,
            date: tomorrowStr,
            types: fastingTypes
          });
        } catch (error) {
          console.error(`Failed to send notification to ${userEmail}:`, error);
        }
      }
    }
    
    return Response.json({
      message: 'Daily fasting notifications sent',
      notifications_sent: notifications.length,
      details: notifications
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getHijriDate(date) {
  try {
    const timestamp = Math.floor(date.getTime() / 1000);
    const response = await fetch(`https://api.aladhan.com/v1/gToH/${timestamp}`);
    const data = await response.json();
    
    if (data.code === 200) {
      const hijri = data.data.hijri;
      return {
        day: parseInt(hijri.day),
        month: hijri.month.number,
        year: parseInt(hijri.year),
        monthName: hijri.month.en
      };
    }
  } catch (error) {
    console.error('Hijri date calculation error:', error);
  }
  return null;
}
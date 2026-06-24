import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Islamic calendar — Ramadan windows & Eid dates (extend annually)
const RAMADAN_WINDOWS = [
  { start: '2025-03-01', end: '2025-03-30' },
  { start: '2026-02-18', end: '2026-03-19' },
  { start: '2027-02-07', end: '2027-03-08' },
  { start: '2028-01-28', end: '2028-02-26' },
];

const EID_DATES = [
  '2025-03-31', '2025-06-06', // Eid al-Fitr & Eid al-Adha 2025
  '2026-03-20', '2026-05-26',
  '2027-03-09', '2027-05-16',
  '2028-02-27', '2028-05-05',
];

function isInRamadan(date) {
  const ds = date.toISOString().split('T')[0];
  return RAMADAN_WINDOWS.some(w => ds >= w.start && ds <= w.end);
}

function isEidDay(date) {
  const ds = date.toISOString().split('T')[0];
  return EID_DATES.includes(ds);
}

function shouldSendFastingReminder(date) {
  if (isInRamadan(date)) return false;
  if (isEidDay(date)) return false;
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 1 || dayOfWeek === 4) return true;
  const gregorianDay = date.getDate();
  if (gregorianDay >= 13 && gregorianDay <= 15) return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (!shouldSendFastingReminder(now)) {
      return Response.json({ message: 'Not a fasting day today', reminders_sent: 0 });
    }

    const allSettings = await base44.asServiceRole.entities.UserSettings.filter({
      notifications_enabled: true
    });
    
    const dayOfWeek = now.getDay();
    const fastingType = dayOfWeek === 1 ? 'Monday' : dayOfWeek === 4 ? 'Thursday' : 'White Moon Days';

    const reminders = [];
    
    for (const settings of allSettings) {
      const userEmail = settings.created_by;
      if (!userEmail) continue;
      
      // Dedup: check if already sent today — filter by user_email and date prefix on created_date
      const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
        user_email: userEmail,
        type: 'system'
      });
      
      const alreadySentToday = existingNotifs.some(n => {
        const createdDate = new Date(n.created_date).toISOString().split('T')[0];
        return createdDate === today && n.title?.includes('Fasting');
      });
      
      if (alreadySentToday) {
        console.log(`Fasting reminder already sent today for ${userEmail}, skipping`);
        continue;
      }
      
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'system',
          title: `🌙 Sunnah Fasting - ${fastingType}`,
          message: `Today is ${fastingType}. Consider observing the Sunnah fast.`,
          priority: 'medium',
          is_read: false,
          metadata: {
            fasting_type: fastingType,
            reminder_type: 'sunnah_fasting'
          }
        });
        
        if (settings.email_notifications !== false) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: userEmail,
            subject: `🌙 Sunnah Fasting Reminder - ${fastingType}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🌙 Sunnah Fasting</h1>
                  <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">${fastingType} Fast</p>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                  <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Assalamu Alaikum,</p>
                  <div style="background: white; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; border: 2px solid #8b5cf6;">
                    <p style="margin: 0; color: #8b5cf6; font-size: 18px; font-weight: bold;">Today is ${fastingType}</p>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">A recommended day for Sunnah fasting</p>
                  </div>
                  <p style="font-size: 14px; color: #6b7280; font-style: italic; margin-top: 20px;">
                    "Whoever fasts two days in a month other than Ramadan, it is as if he has fasted the whole month." - Hadith
                  </p>
                </div>
              </div>
            `
          });
        }
        
        reminders.push({ user: userEmail, fasting_type: fastingType });
        console.log(`Sent fasting reminder to ${userEmail} for ${fastingType}`);
      } catch (err) {
        console.error(`Failed to send fasting reminder to ${userEmail}:`, err);
      }
    }
    
    return Response.json({
      message: 'Fasting reminders sent',
      reminders_sent: reminders.length,
      details: reminders
    });
  } catch (error) {
    console.error('Fasting reminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
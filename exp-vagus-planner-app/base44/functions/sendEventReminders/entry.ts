/**
 * Sends email reminders for upcoming calendar events.
 * Runs every minute via scheduled automation.
 * Checks each event's reminder settings and sends via Resend.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendReminderEmail({ to, eventTitle, startTime, minutesBefore, location }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vagus Planner <support@vagusplanner.com>',
      to: [to],
      reply_to: 'support@vagusplanner.com',
      subject: `⏰ Reminder: "${eventTitle}" in ${minutesBefore} minutes`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071224;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png" alt="Vagus Planner" style="width:44px;height:44px;border-radius:10px;margin-bottom:12px;" />
    <h2 style="color:#E8B84B;margin:0;font-size:20px;">⏰ Event Reminder</h2>
  </div>
  <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(232,184,75,0.2);border-radius:14px;padding:24px;margin-bottom:20px;">
    <h3 style="color:#ffffff;margin:0 0 12px;font-size:18px;">${eventTitle}</h3>
    <p style="color:#6de4be;margin:0 0 8px;font-size:14px;">🕐 Starts at <strong>${startTime}</strong></p>
    <p style="color:#E8B84B;margin:0 0 8px;font-size:14px;">⏱ In <strong>${minutesBefore} minutes</strong></p>
    ${location ? `<p style="color:#94a3b8;margin:0;font-size:13px;">📍 ${location}</p>` : ''}
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://vagusplanner.com/Calendar" style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">View Calendar →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
    <p style="color:#475569;font-size:11px;margin:0;">Manage notification preferences in <a href="https://vagusplanner.com/Settings" style="color:#E8B84B;">Settings → Notifications</a></p>
  </div>
</div>`
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const events = await base44.asServiceRole.entities.Event.list('-start_date', 1000);

    // Get user settings indexed by email for quick lookup
    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const settingsByEmail = {};
    for (const s of allSettings) {
      if (s.created_by) settingsByEmail[s.created_by] = s;
    }

    let remindersSent = 0;

    for (const event of events) {
      if (!event.reminders || event.reminders.length === 0) continue;

      const eventTime = new Date(event.start_date);

      // Skip past events (more than 1 day ago)
      if (eventTime < new Date(now.getTime() - 24 * 60 * 60 * 1000)) continue;

      const userEmail = event.created_by;
      if (!userEmail) continue;

      // Check user's email notification preferences
      const userSettings = settingsByEmail[userEmail];
      if (userSettings && userSettings.email_notifications === false) continue;
      if (userSettings && userSettings.notifications_enabled === false) continue;

      // Check do-not-disturb
      if (userSettings?.do_not_disturb) continue;

      for (const reminder of event.reminders) {
        if (reminder.sent) continue;
        if (reminder.type !== 'email') continue;

        const reminderTime = new Date(eventTime.getTime() - reminder.minutes_before * 60 * 1000);
        const diffMs = Math.abs(now.getTime() - reminderTime.getTime());

        // Fire if within 60 second window
        if (diffMs > 60 * 1000) continue;

        const startTimeStr = eventTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

        await sendReminderEmail({
          to: userEmail,
          eventTitle: event.title,
          startTime: startTimeStr,
          minutesBefore: reminder.minutes_before,
          location: event.location,
        });

        // Mark reminder as sent
        const updatedReminders = event.reminders.map(r =>
          r.minutes_before === reminder.minutes_before && r.type === reminder.type
            ? { ...r, sent: true }
            : r
        );
        await base44.asServiceRole.entities.Event.update(event.id, { reminders: updatedReminders });

        console.log(`Event reminder sent to ${userEmail} for "${event.title}" (${reminder.minutes_before}min before)`);
        remindersSent++;
      }
    }

    return Response.json({ success: true, reminders_sent: remindersSent });
  } catch (error) {
    console.error('sendEventReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Optimised Journal Reminder — runs hourly via automation.
 * Batches all queries, avoids per-user loops with heavy DB calls.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const todayStr = new Date().toISOString().split('T')[0];
    const nowUTC = new Date();
    const nowMin = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();

    // Fetch all settings, today's reflections and today's journal notifications in parallel
    const [allSettings, todayReflections, todayNotifs] = await Promise.all([
      base44.asServiceRole.entities.UserSettings.list(),
      base44.asServiceRole.entities.Reflection.filter({ date: todayStr }),
      base44.asServiceRole.entities.Notification.filter({ type: 'journal_reminder' }),
    ]);

    // Build fast lookup sets
    const journaledToday = new Set(todayReflections.map(r => r.created_by));
    const notifiedToday = new Set(
      todayNotifs
        .filter(n => n.created_date?.startsWith(todayStr))
        .map(n => n.recipient_email)
    );

    const sent = [];

    for (const settings of allSettings) {
      const userEmail = settings.created_by;
      if (!userEmail) continue;
      if (!settings.journal_reminder_enabled) continue;

      // Check time window (±30 min around configured time)
      const reminderTime = settings.journal_reminder_time_utc || '20:00';
      const [rHour, rMin] = reminderTime.split(':').map(Number);
      const reminderMin = rHour * 60 + rMin;
      const diff = nowMin - reminderMin;
      if (diff < 0 || diff > 59) continue;

      // Skip if already journaled or notified today
      if (journaledToday.has(userEmail)) continue;
      if (notifiedToday.has(userEmail)) continue;

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: userEmail,
        type: 'journal_reminder',
        title: '📔 Journal Reminder',
        message: "You haven't written your journal entry today. Take a moment to reflect on your day.",
        priority: 'normal',
        metadata: { date: todayStr }
      });

      // Send email if opted in
      if (settings.journal_reminder_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: userEmail,
          subject: '📔 Daily Journal Reminder — Vagus Planner',
          body: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5faff;">
  <div style="background:linear-gradient(135deg,#1a3a6e 0%,#1a7ab8 60%,#4ec9a0 100%);padding:32px;text-align:center;border-radius:16px 16px 0 0;">
    <h1 style="color:#E8B84B;margin:0;font-size:26px;">📔 Daily Reflection</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Vagus Planner · Life. Faith. Balance.</p>
  </div>
  <div style="padding:32px;background:#fff;border-radius:0 0 16px 16px;border:1px solid #e0f0fa;">
    <p style="font-size:17px;color:#1a3a6e;font-weight:600;margin-bottom:12px;">You haven't journaled today yet.</p>
    <p style="font-size:15px;color:#4a6080;line-height:1.7;margin-bottom:24px;">Taking just 5 minutes to reflect on your day can improve your mental clarity, gratitude, and spiritual awareness.</p>
    <div style="background:linear-gradient(135deg,#f0f7ff,#e8f5f0);border-left:4px solid #4ec9a0;padding:16px;border-radius:8px;margin-bottom:24px;">
      <p style="margin:0;color:#1a5a9a;font-size:14px;font-style:italic;">"Indeed, in the remembrance of Allah do hearts find rest." — Quran 13:28</p>
    </div>
    <a href="https://vagusplanner.base44.app/Journal" style="display:inline-block;background:linear-gradient(135deg,#1a5a9a,#4ec9a0);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:15px;">✍️ Write Today's Entry</a>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Manage preferences: <a href="https://vagusplanner.base44.app/Settings" style="color:#1a7ab8;">Settings</a></p>
  </div>
</div>`
        });
      }

      sent.push(userEmail);
      console.log(`[INFO] Journal reminder sent to ${userEmail}`);
    }

    return Response.json({ processed: allSettings.length, sent: sent.length, recipients: sent });
  } catch (error) {
    console.error('[ERROR] sendJournalReminders:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
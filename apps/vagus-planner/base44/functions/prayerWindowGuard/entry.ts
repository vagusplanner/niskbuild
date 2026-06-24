import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * prayerWindowGuard
 *
 * Runs every 15 minutes. For each user with Islamic mode + prayer_enabled:
 *  1. Reads cached prayer times from UserSettings.
 *  2. If any prayer is within the next 15 minutes, sends a "silence" notification
 *     that suggests pausing productivity timers and silencing alerts.
 *  3. Prevents duplicate notifications (tracks last prayer notified in settings).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const nowUTC = new Date();
    const nowMinutes = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();

    // Fetch all users who have prayer_enabled
    const allSettings = await base44.asServiceRole.entities.UserSettings.filter({
      prayer_enabled: true
    });

    let notified = 0;
    const results = [];

    for (const settings of allSettings) {
      const ownerEmail = settings.created_by;
      if (!ownerEmail) continue;

      // Read cached prayer times
      const prayerTimesCache = settings.prayer_times_cache;
      const cacheDate = settings.prayer_times_cache_date;
      const todayStr = nowUTC.toISOString().split('T')[0];

      if (!prayerTimesCache || cacheDate !== todayStr) {
        // Cache is stale — skip (fetchPrayerTimes automation handles refresh)
        continue;
      }

      const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      const lastNotified = settings.last_prayer_window_notified || '';

      for (const prayer of PRAYERS) {
        const timeStr = prayerTimesCache[prayer];
        if (!timeStr) continue;

        const [ph, pm] = timeStr.split(':').map(Number);
        const prayerMinutes = ph * 60 + pm;

        // Check if prayer is within next 10–15 minutes
        const diff = prayerMinutes - nowMinutes;
        if (diff < 10 || diff > 15) continue;

        // Avoid duplicate: if same prayer already notified today, skip
        const notifKey = `${todayStr}-${prayer}`;
        if (lastNotified === notifKey) continue;

        const prayerLabel = prayer.charAt(0).toUpperCase() + prayer.slice(1);

        // AI-generated context-aware message
        let message = `${prayerLabel} prayer begins in ~${diff} minutes. Consider silencing notifications and pausing any active timers for your 15-minute prayer window.`;
        try {
          const ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Write a single warm, brief (1 sentence) reminder for a Muslim user that ${prayerLabel} prayer starts in about ${diff} minutes. Suggest they pause their work/timers and prepare. Keep it calm and non-intrusive. No emojis in the text itself.`,
          });
          if (ai && typeof ai === 'string' && ai.length > 10) message = ai;
        } catch {
          // fallback to default message above
        }

        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          type: 'prayer',
          title: `🕌 ${prayerLabel} in ${diff} min — Pause & Prepare`,
          message,
          priority: 'high',
          icon: '🕌',
          action_url: '/Islam',
          action_data: { prayer, prayer_time: timeStr, window_minutes: 15 },
          scheduled_time: nowUTC.toISOString(),
          sent_time: nowUTC.toISOString(),
          is_read: false,
          dismissed: false,
          ai_generated: true,
          sound_enabled: true,
          created_by: ownerEmail
        });

        // Mark as notified to prevent duplicates in next run
        await base44.asServiceRole.entities.UserSettings.update(settings.id, {
          last_prayer_window_notified: notifKey
        });

        // Dispatch browser-level event hint (picked up by Pomodoro/timer components)
        // stored as a flag on the notification for client to read
        console.log(`Prayer window notification sent: ${prayer} for ${ownerEmail} at ${timeStr}`);
        notified++;
        results.push({ user: ownerEmail, prayer: prayerLabel, time: timeStr, diff_minutes: diff });
        break; // only one prayer per user per run
      }
    }

    return Response.json({
      message: 'Prayer window check complete',
      users_checked: allSettings.length,
      notifications_sent: notified,
      details: results
    });

  } catch (error) {
    console.error('prayerWindowGuard error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Fetches prayer times from Aladhan API and creates notification records for all users
// Should be called by a scheduled automation (daily, early morning)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify admin or internal call
    const authHeader = req.headers.get('authorization') || '';
    let isAdmin = false;
    if (authHeader.startsWith('Bearer ')) {
      try {
        const user = await base44.auth.me();
        isAdmin = user?.role === 'admin';
      } catch {}
    }
    // Also allow internal service calls via secret header
    const internalSecret = req.headers.get('x-internal-secret');
    if (!isAdmin && internalSecret !== Deno.env.get('BASE44_APP_ID')) {
      // For scheduled automations, allow if no auth at all (called by the platform)
      const hasNoAuth = !authHeader;
      if (!hasNoAuth) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const usersWithPrayer = allSettings.filter(s => s.prayer_enabled !== false && s.notifications_enabled !== false);

    let created = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const settings of usersWithPrayer) {
      if (!settings.created_by) continue;

      const lat = settings.latitude || 51.5074;
      const lng = settings.longitude || -0.1278;
      const method = settings.prayer_method === 'ISNA' ? 2 :
                     settings.prayer_method === 'Egypt' ? 5 :
                     settings.prayer_method === 'Makkah' ? 4 :
                     settings.prayer_method === 'Karachi' ? 1 :
                     settings.prayer_method === 'Tehran' ? 7 :
                     settings.prayer_method === 'Jafari' ? 0 : 3; // MWL default

      let prayerTimes;
      try {
        const apiRes = await fetch(
          `https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=${method}`
        );
        const apiData = await apiRes.json();
        const t = apiData.data?.timings;
        if (!t) throw new Error('No timings');
        prayerTimes = [
          { name: 'Fajr',    time: t.Fajr },
          { name: 'Dhuhr',   time: t.Dhuhr },
          { name: 'Asr',     time: t.Asr },
          { name: 'Maghrib', time: t.Maghrib },
          { name: 'Isha',    time: t.Isha },
        ];
      } catch {
        // Fallback generic times
        prayerTimes = [
          { name: 'Fajr',    time: '05:30' },
          { name: 'Dhuhr',   time: '12:30' },
          { name: 'Asr',     time: '15:45' },
          { name: 'Maghrib', time: '18:15' },
          { name: 'Isha',    time: '19:45' },
        ];
      }

      const notifyBefore = settings.notify_before_minutes || 10;
      const offsets = settings.prayer_time_offsets || {};

      for (const prayer of prayerTimes) {
        // Parse time
        const [h, m] = prayer.time.split(':').map(Number);
        const offsetMin = offsets[prayer.name.toLowerCase()] || 0;
        const prayerDate = new Date(`${today}T00:00:00`);
        prayerDate.setHours(h, m + offsetMin, 0, 0);

        // Notification fires `notifyBefore` minutes before
        const notifyAt = new Date(prayerDate.getTime() - notifyBefore * 60 * 1000);
        if (notifyAt < new Date()) continue; // already passed

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: settings.created_by,
          title: `🕌 ${prayer.name} Prayer`,
          message: `${prayer.name} prayer is in ${notifyBefore} minutes (${prayer.time})`,
          type: 'prayer_time',
          priority: 'high',
          is_read: false,
          scheduled_for: notifyAt.toISOString(),
          entity_type: 'prayer',
          entity_id: prayer.name.toLowerCase(),
        });
        created++;
      }

      // Daily Hadith notification (once per day at 7am)
      const hadithAt = new Date(`${today}T07:00:00`);
      if (hadithAt > new Date()) {
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: settings.created_by,
          title: '📖 Daily Hadith',
          message: 'Your daily Hadith reminder is ready — tap to reflect and learn.',
          type: 'islamic_event',
          priority: 'normal',
          is_read: false,
          scheduled_for: hadithAt.toISOString(),
          entity_type: 'hadith',
          entity_id: 'daily',
        });
        created++;
      }

      // Zakat reminder — check if any pending ZakatCalculations
      const zakatRecs = await base44.asServiceRole.entities.ZakatCalculation.filter({
        created_by: settings.created_by,
      });
      const unpaid = zakatRecs.filter(z => z.status !== 'completed' && z.zakat_due > 0);
      if (unpaid.length > 0) {
        const total = unpaid.reduce((s, z) => s + (z.zakat_due - (z.amount_paid || 0)), 0);
        const zakatAt = new Date(`${today}T09:00:00`);
        if (zakatAt > new Date()) {
          await base44.asServiceRole.entities.Notification.create({
            recipient_email: settings.created_by,
            title: '💰 Zakat Reminder',
            message: `You have $${total.toFixed(2)} in outstanding Zakat. Purify your wealth today.`,
            type: 'islamic_event',
            priority: 'high',
            is_read: false,
            scheduled_for: zakatAt.toISOString(),
            entity_type: 'zakat',
            entity_id: 'reminder',
          });
          created++;
        }
      }
    }

    console.log(`[pushNotificationScheduler] Created ${created} notifications for ${usersWithPrayer.length} users`);
    return Response.json({ success: true, created, users: usersWithPrayer.length });

  } catch (error) {
    console.error('[pushNotificationScheduler] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
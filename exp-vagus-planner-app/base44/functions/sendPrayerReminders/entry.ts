/**
 * Sends email reminders for prayer times.
 * Runs every 5 minutes via scheduled automation.
 * Only sends to users who have: prayer_enabled=true, email_notifications=true, islamic_mode=true
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const PRAYER_EMOJI = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤', Maghrib: '🌇', Isha: '🌙' };

async function sendPrayerEmail({ to, prayer, prayerTime, minutesBefore }) {
  const emoji = PRAYER_EMOJI[prayer] || '🕌';
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
      subject: `${emoji} ${prayer} Prayer in ${minutesBefore} minutes (${prayerTime})`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071224;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:52px;margin-bottom:8px;">${emoji}</div>
    <h1 style="color:#E8B84B;margin:0;font-size:22px;">${prayer} Prayer Reminder</h1>
    <p style="color:#6de4be;margin:6px 0 0;font-size:14px;">Time to prepare — prayer in <strong>${minutesBefore} minutes</strong></p>
  </div>
  <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(232,184,75,0.25);border-radius:14px;padding:24px;margin-bottom:20px;text-align:center;">
    <p style="color:#ffffff;font-size:32px;font-weight:bold;margin:0 0 8px;">${prayerTime}</p>
    <p style="color:#94a3b8;font-size:13px;margin:0;">Prayer time for your location</p>
  </div>
  <div style="background:linear-gradient(135deg,rgba(26,74,110,0.6),rgba(26,122,184,0.4));border-radius:12px;padding:18px;margin-bottom:20px;">
    <p style="color:#cbd5e1;font-size:13px;margin:0;line-height:1.7;text-align:center;font-style:italic;">
      "Indeed, prayer has been decreed upon the believers a decree of specified times." — Quran 4:103
    </p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://vagusplanner.com/Islam" style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">Open Islamic Dashboard →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:16px;">
    <p style="color:#475569;font-size:11px;margin:0;">Manage prayer notifications in <a href="https://vagusplanner.com/Settings" style="color:#E8B84B;">Settings → Notifications</a></p>
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

async function getPrayerTimes(date, latitude, longitude, method) {
  const timestamp = Math.floor(date.getTime() / 1000);
  const methodMap = { MWL: 3, ISNA: 2, Egypt: 5, Makkah: 4, Karachi: 1, Tehran: 7, Jafari: 0 };
  const methodNum = methodMap[method] || 3;
  const response = await fetch(`https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${methodNum}`);
  if (!response.ok) throw new Error('Prayer API failed');
  const data = await response.json();
  const t = data.data.timings;
  return { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    // Only users with prayer + email notifications enabled
    const allSettings = await base44.asServiceRole.entities.UserSettings.filter({
      prayer_enabled: true,
      notifications_enabled: true,
      email_notifications: true,
      islamic_mode: true,
    });

    let remindersSent = 0;

    for (const settings of allSettings) {
      const userEmail = settings.created_by;
      if (!userEmail) continue;
      if (settings.do_not_disturb) continue;

      const lat = settings.latitude || 51.5074;
      const lng = settings.longitude || -0.1278;
      const method = settings.prayer_method || 'MWL';
      const minutesBefore = settings.notify_before_minutes || 10;

      let prayerTimes;
      try {
        prayerTimes = await getPrayerTimes(now, lat, lng, method);
      } catch (e) {
        console.error(`Prayer times fetch failed for ${userEmail}:`, e.message);
        continue;
      }

      for (const [prayer, prayerTime] of Object.entries(prayerTimes)) {
        const [pH, pM] = prayerTime.split(':').map(Number);
        let rH = pH, rM = pM - minutesBefore;
        if (rM < 0) { rM += 60; rH -= 1; if (rH < 0) rH += 24; }
        const reminderTime = `${String(rH).padStart(2,'0')}:${String(rM).padStart(2,'0')}`;

        if (currentTime !== reminderTime) continue;

        // Dedup — check if already sent today
        const dedupKey = `PRAYER_EMAIL_${prayer}_${today}_${userEmail}`;
        const existing = await base44.asServiceRole.entities.SmartNotification.filter({ title: dedupKey });
        if (existing.length > 0) continue;

        // Send email
        await sendPrayerEmail({ to: userEmail, prayer, prayerTime, minutesBefore });

        // Record dedup marker
        await base44.asServiceRole.entities.SmartNotification.create({
          title: dedupKey,
          message: `Prayer email reminder sent for ${prayer}`,
          type: 'prayer_time',
          status: 'sent',
          ai_generated: false,
        });

        console.log(`Prayer email sent to ${userEmail}: ${prayer} at ${prayerTime}`);
        remindersSent++;
      }
    }

    return Response.json({ success: true, reminders_sent: remindersSent });
  } catch (error) {
    console.error('sendPrayerReminders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
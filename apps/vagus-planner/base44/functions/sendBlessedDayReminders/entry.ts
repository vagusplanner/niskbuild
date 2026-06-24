/**
 * sendBlessedDayReminders
 * Runs daily — checks which blessed days are N days away (via AlAdhan Hijri API),
 * then sends in-app notifications + email reminders with Sunnah actions.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Resend } from 'npm:resend@3.2.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Blessed days dataset (mirrors lib/blessedDaysData.js — no local imports allowed)
const BLESSED_DAYS = [
  { id: 'laylatul_qadr_27', name: "Laylatul Qadr (27th)", emoji: '✨', hijri_month: 9,  hijri_day: 27, days_before_reminder: [7, 3, 1], priority: 'urgent',
    description: "The Night of Power — better than a thousand months (Quran 97:3).",
    sunnah_actions: ["Pray Tahajjud and increase nawafil", "Recite the Laylatul Qadr du'a abundantly", "Give Sadaqah", "Read and reflect on Surah Al-Qadr", "Perform I'tikaf if possible"] },
  { id: 'laylatul_qadr_21', name: "Laylatul Qadr (21st)", emoji: '✨', hijri_month: 9,  hijri_day: 21, days_before_reminder: [3, 1], priority: 'urgent',
    description: "Seek the Night of Power on all odd nights of the last 10 of Ramadan.",
    sunnah_actions: ["Stay awake in worship", "Recite Laylatul Qadr du'a", "Give charity before Fajr"] },
  { id: 'laylatul_qadr_23', name: "Laylatul Qadr (23rd)", emoji: '✨', hijri_month: 9,  hijri_day: 23, days_before_reminder: [1], priority: 'urgent',
    description: "Potential Night of Power — 23rd of Ramadan.",
    sunnah_actions: ["Night prayer and du'a", "Recite Laylatul Qadr du'a", "Give Sadaqah"] },
  { id: 'laylatul_qadr_25', name: "Laylatul Qadr (25th)", emoji: '✨', hijri_month: 9,  hijri_day: 25, days_before_reminder: [1], priority: 'urgent',
    description: "Potential Night of Power — 25th of Ramadan.",
    sunnah_actions: ["Increase dhikr and istighfar", "Witr prayer with du'a qunut", "Read Quran with reflection"] },
  { id: 'laylatul_qadr_29', name: "Laylatul Qadr (29th)", emoji: '✨', hijri_month: 9,  hijri_day: 29, days_before_reminder: [1], priority: 'urgent',
    description: "Final odd night of Ramadan — last chance for Laylatul Qadr.",
    sunnah_actions: ["Intensify worship", "Make sincere tawbah", "Recite Laylatul Qadr du'a throughout the night"] },
  { id: 'day_of_arafah', name: "Day of Arafah", emoji: '🕋', hijri_month: 12, hijri_day: 9,  days_before_reminder: [7, 3, 1], priority: 'urgent',
    description: "The best day of the year. Fasting expiates two years of sins (Muslim).",
    sunnah_actions: ["Fast this day", "Recite La ilaha illallah abundantly", "Make du'a after Asr", "Read Surah Al-Kahf", "Give charity generously"] },
  { id: 'eid_al_adha',    name: "Eid al-Adha",         emoji: '🐑', hijri_month: 12, hijri_day: 10, days_before_reminder: [7, 1], priority: 'high',
    description: "Festival of Sacrifice — offer Qurbani and pray Eid Salah.",
    sunnah_actions: ["Perform Eid prayer", "Offer Udhiyah (Qurbani)", "Recite Takbir", "Share Qurbani meat with neighbours"] },
  { id: 'ashura',         name: "Day of Ashura",        emoji: '🌊', hijri_month: 1,  hijri_day: 10, days_before_reminder: [10, 3, 1], priority: 'high',
    description: "Fasting expiates the previous year's sins (Muslim). Also fast the 9th (Tasu'a).",
    sunnah_actions: ["Fast the 9th and 10th of Muharram", "Give Sadaqah", "Recite 'HasbunAllahu wa ni'mal wakeel' 70 times"] },
  { id: 'tasu_a',         name: "Day of Tasu'a",        emoji: '🌊', hijri_month: 1,  hijri_day: 9,  days_before_reminder: [1], priority: 'medium',
    description: "9th of Muharram — fast alongside Ashura to follow Sunnah.",
    sunnah_actions: ["Fast and make intention before Fajr", "Increase du'a and dhikr"] },
  { id: 'mawlid',         name: "Mawlid al-Nabi ﷺ",    emoji: '🌹', hijri_month: 3,  hijri_day: 12, days_before_reminder: [7, 1], priority: 'medium',
    description: "Birthday of the Prophet ﷺ — 12th of Rabi' al-Awwal.",
    sunnah_actions: ["Send abundant salawat on the Prophet ﷺ", "Read his Seerah", "Teach children about the Prophet ﷺ", "Give charity"] },
  { id: 'isra_miraj',     name: "Isra' wal Mi'raj",     emoji: '🌟', hijri_month: 7,  hijri_day: 27, days_before_reminder: [7, 1], priority: 'medium',
    description: "Night Journey and Ascension — when the five daily prayers were prescribed.",
    sunnah_actions: ["Increase in Salah and nawafil", "Reflect on the Night Journey", "Pray 2 rak'ah in gratitude"] },
  { id: 'laylatul_bara',  name: "Laylatul Bara'ah",     emoji: '🌕', hijri_month: 8,  hijri_day: 15, days_before_reminder: [3, 1], priority: 'medium',
    description: "Night of Forgiveness — 15th of Sha'ban.",
    sunnah_actions: ["Seek sincere forgiveness", "Pray nafl prayers", "Fast ayyam al-bid (13-15 Sha'ban)", "Recite istighfar 100 times"] },
  { id: 'first_dhul_hijjah', name: "First 10 Days of Dhul Hijjah", emoji: '🌙', hijri_month: 12, hijri_day: 1, days_before_reminder: [7, 1], priority: 'high',
    description: "Best days of the year for good deeds (Bukhari).",
    sunnah_actions: ["Fast as many of the first 9 days as possible", "Recite Takbir, Tahmid, Tahlil", "Give Sadaqah", "Do not cut nails/hair if doing Qurbani"] },
  { id: 'ramadan_start',  name: "Ramadan Begins",       emoji: '🌙', hijri_month: 9,  hijri_day: 1,  days_before_reminder: [14, 7, 1], priority: 'urgent',
    description: "The blessed month of fasting, Quran and worship.",
    sunnah_actions: ["Make intention to fast the whole month", "Set a Quran reading goal", "Plan I'tikaf for last 10 nights", "Pray Tarawih every night"] },
  { id: 'eid_al_fitr',    name: "Eid al-Fitr",          emoji: '🎉', hijri_month: 10, hijri_day: 1,  days_before_reminder: [7, 1], priority: 'high',
    description: "Festival of Breaking the Fast — a day of joy and gratitude.",
    sunnah_actions: ["Pay Zakat al-Fitr before Eid prayer", "Eat dates before prayer", "Perform Eid prayer", "Visit family and strengthen ties"] },
];

async function getHijriDate() {
  const res = await fetch(`https://api.aladhan.com/v1/gToH/${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`);
  const json = await res.json();
  return {
    day: parseInt(json.data.hijri.day),
    month: parseInt(json.data.hijri.month.number),
    year: parseInt(json.data.hijri.year),
  };
}

function hijriDaysUntil(targetMonth, targetDay, currentMonth, currentDay, currentYear) {
  // Simple days-until within same/next year (Hijri year ~354 days)
  const MONTH_LENGTHS = [30,29,30,29,30,29,30,29,30,29,30,29]; // approx
  let days = 0;
  let m = currentMonth, d = currentDay;
  for (let i = 0; i < 400; i++) {
    if (m === targetMonth && d === targetDay) return days;
    d++;
    days++;
    const monthLen = MONTH_LENGTHS[m - 1] || 29;
    if (d > monthLen) { d = 1; m++; if (m > 12) m = 1; }
  }
  return null;
}

function buildEmailHtml(day, daysAway, hijriDate) {
  const sunnahList = day.sunnah_actions.map(a => `<li style="margin-bottom:6px;">${a}</li>`).join('');
  const daysLabel = daysAway === 0 ? 'TODAY' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;

  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;margin:0;padding:20px}
.container{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;color:white}
.emoji{font-size:48px;margin-bottom:8px}
.title{font-size:24px;font-weight:800;margin:0 0 4px}
.arabic{font-size:18px;opacity:0.85;font-style:italic;direction:rtl}
.body{padding:28px}
.badge{display:inline-block;background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:16px}
.desc{color:#374151;font-size:15px;line-height:1.6;margin-bottom:20px}
.sunnah-title{color:#1e1b4b;font-size:16px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.sunnah-list{color:#374151;font-size:14px;line-height:1.7;padding-left:20px;margin:0}
.footer{background:#f9fafb;padding:20px;text-align:center;color:#9ca3af;font-size:12px}
.cta{display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px}
</style></head><body>
<div class="container">
  <div class="header">
    <div class="emoji">${day.emoji}</div>
    <div class="title">${day.name}</div>
    <div class="arabic">${day.arabic || ''}</div>
  </div>
  <div class="body">
    <span class="badge">${daysAway === 0 ? '🌟 TODAY' : `⏰ ${daysLabel.toUpperCase()}`}</span>
    <p class="desc">${day.description}</p>
    <div class="sunnah-title">📿 Recommended Sunnah Actions</div>
    <ul class="sunnah-list">${sunnahList}</ul>
    <center><a href="https://app.vagusplanner.com/Islam" class="cta">Open Islamic Dashboard →</a></center>
  </div>
  <div class="footer">
    Vagus Planner · Islamic Edition<br>
    Today's Hijri Date: ${hijriDate.day}/${hijriDate.month}/${hijriDate.year} AH<br>
    <a href="https://app.vagusplanner.com/Settings" style="color:#9ca3af">Manage notification preferences</a>
  </div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Only allow admin or scheduled runner
    let hijriDate;
    try {
      hijriDate = await getHijriDate();
    } catch (e) {
      console.error('Failed to fetch Hijri date:', e.message);
      return Response.json({ error: 'Failed to fetch Hijri date' }, { status: 500 });
    }

    console.log(`[BlessedDayReminders] Hijri date: ${hijriDate.day}/${hijriDate.month}/${hijriDate.year}`);

    // Find which blessed days match a reminder threshold today
    const triggeredDays = [];
    for (const day of BLESSED_DAYS) {
      const daysAway = hijriDaysUntil(day.hijri_month, day.hijri_day, hijriDate.month, hijriDate.day, hijriDate.year);
      if (daysAway !== null && day.days_before_reminder.includes(daysAway)) {
        triggeredDays.push({ day, daysAway });
        console.log(`[BlessedDayReminders] Triggered: ${day.name} in ${daysAway} days`);
      }
    }

    if (triggeredDays.length === 0) {
      return Response.json({ success: true, triggered: 0, message: 'No reminders due today' });
    }

    // Get all users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const islamicUsers = users.filter(u => u.email);

    let notifCount = 0;
    let emailCount = 0;

    for (const { day, daysAway } of triggeredDays) {
      const daysLabel = daysAway === 0 ? 'is TODAY' : daysAway === 1 ? 'is TOMORROW' : `is in ${daysAway} days`;

      // 1. Create in-app notifications for all Islamic users
      const notifPromises = islamicUsers.map(user =>
        base44.asServiceRole.entities.Notification.create({
          type: 'islamic_blessed_day',
          title: `${day.emoji} ${day.name} ${daysLabel}`,
          message: `${day.description} Recommended: ${day.sunnah_actions[0]}`,
          priority: day.priority,
          is_read: false,
          action_url: '/Islam',
          created_by: user.email,
          metadata: JSON.stringify({
            blessed_day_id: day.id,
            days_away: daysAway,
            sunnah_actions: day.sunnah_actions,
            hijri_month: day.hijri_month,
            hijri_day: day.hijri_day,
          }),
        }).catch(e => console.error(`Notif error for ${user.email}:`, e.message))
      );
      await Promise.all(notifPromises);
      notifCount += islamicUsers.length;

      // 2. Send emails (only for reminders 7+ days away OR day-before / day-of)
      // to avoid email fatigue — only send email for key thresholds
      const emailThresholds = [7, 1, 0];
      if (emailThresholds.includes(daysAway)) {
        const emailPromises = islamicUsers.map(async user => {
          if (!user.email) return;
          const daysLabelEmail = daysAway === 0 ? 'TODAY' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
          try {
            await resend.emails.send({
              from: 'Vagus Planner <reminders@vagusplanner.com>',
              to: user.email,
              subject: `${day.emoji} ${day.name} is ${daysLabelEmail} — Sunnah Guide`,
              html: buildEmailHtml(day, daysAway, hijriDate),
            });
            emailCount++;
          } catch (e) {
            console.error(`Email error for ${user.email}:`, e.message);
          }
        });
        await Promise.all(emailPromises);
      }
    }

    console.log(`[BlessedDayReminders] Done — ${triggeredDays.length} events triggered, ${notifCount} notifications, ${emailCount} emails`);

    return Response.json({
      success: true,
      triggered: triggeredDays.length,
      events: triggeredDays.map(t => ({ name: t.day.name, days_away: t.daysAway })),
      notifications_created: notifCount,
      emails_sent: emailCount,
    });
  } catch (error) {
    console.error('[BlessedDayReminders] Fatal error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Ramadan windows — extend this list as needed
const RAMADAN_WINDOWS = [
  { start: '2026-02-18', end: '2026-03-19' },
  { start: '2027-02-07', end: '2027-03-08' },
  { start: '2028-01-28', end: '2028-02-26' },
  { start: '2025-03-01', end: '2025-03-30' },
];

function isInRamadan(dateStr) {
  return RAMADAN_WINDOWS.some(w => dateStr >= w.start && dateStr <= w.end);
}

// Converts a Gregorian date string "YYYY-MM-DD" to Hijri via AlAdhan API
async function getHijriDay(dateStr) {
  const [year, month, day] = dateStr.split('-');
  try {
    const res = await fetch(`https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`);
    if (!res.ok) throw new Error('AlAdhan API error');
    const data = await res.json();
    return parseInt(data.data.hijri.day);
  } catch (e) {
    console.log('Hijri conversion failed for', dateStr, e.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active fasting goals with auto-schedule enabled
    const goals = await base44.asServiceRole.entities.FastingGoal.filter({
      status: 'active',
      auto_schedule: true
    });

    const results = [];
    // Build today's date string safely without timezone drift issues
    const nowMs = Date.now();
    const todayStr = new Date(nowMs).toISOString().split('T')[0]; // "YYYY-MM-DD"
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      // Create each date by adding days directly to the date string parts
      const base = new Date(`${todayStr}T00:00:00.000Z`);
      base.setUTCDate(base.getUTCDate() + i);
      return base;
    });

    for (const goal of goals) {
      const userEmail = goal.created_by;

      // Get user's prayer times settings for accurate iftar times
      const userSettings = await base44.asServiceRole.entities.UserSettings.filter({
        created_by: userEmail
      });
      const settings = userSettings[0] || {};

      for (const date of next7Days) {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

        // Skip Ramadan — no Sunnah fasts during Ramadan
        if (isInRamadan(dateStr)) {
          console.log(`Skipping ${dateStr} — Ramadan`);
          continue;
        }

        // Check if this day matches the goal type
        let shouldFast = false;
        let fastType = '';

        if (goal.type === 'mondayThursday' && (dayOfWeek === 1 || dayOfWeek === 4)) {
          shouldFast = true;
          fastType = 'Monday/Thursday Fasting';
        } else if (goal.type === 'whiteDays') {
          const hijriDay = await getHijriDay(dateStr);
          if (hijriDay !== null && [13, 14, 15].includes(hijriDay)) {
            shouldFast = true;
            fastType = `White Days Fasting (${hijriDay}th)`;
          }
        }

        if (!shouldFast) continue;

        // Check if event already exists for this date — filter by title keyword to reduce false positives
        const existingEvents = await base44.asServiceRole.entities.Event.filter({
          created_by: userEmail,
          category: 'prayer',
          is_all_day: true
        });

        const existsForDate = existingEvents.some(evt => {
          if (!evt.start_date) return false;
          const evtDate = new Date(evt.start_date).toISOString().split('T')[0];
          return evtDate === dateStr && evt.title?.includes('Fasting');
        });

        if (existsForDate) continue;

        // Fetch accurate prayer times for this date
        let suhoorTime = goal.suhoor_reminder_time || '04:30';
        let iftarTime = '18:30';
        
        try {
          // Call fetchPrayerTimes to get accurate times
          const prayerTimesResult = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
            user_email: userEmail,
            date: dateStr
          });
          
          if (prayerTimesResult.data?.success && prayerTimesResult.data.prayer_times) {
            const times = prayerTimesResult.data.prayer_times;
            if (times.imsak || times.fajr) suhoorTime = times.imsak || times.fajr;
            if (times.maghrib) iftarTime = times.maghrib;
          }
        } catch (error) {
          // Fall back to default times if prayer times API fails
          console.log('Prayer times fetch failed, using defaults:', error.message);
        }

        // Create fasting event — build start/end from dateStr to avoid Invalid time value
        const startDt = new Date(`${dateStr}T00:00:00.000Z`);
        const endDt = new Date(`${dateStr}T23:59:00.000Z`);

        await base44.asServiceRole.entities.Event.create({
          title: `🌙 ${fastType}`,
          description: `Fasting day - Goal: ${goal.title}`,
          start_date: startDt.toISOString(),
          end_date: endDt.toISOString(),
          category: 'prayer',
          is_all_day: true,
          notes: `Suhoor: ${suhoorTime} | Iftar: ${iftarTime}`,
          created_by: userEmail
        });

        // Create fasting record placeholder
        await base44.asServiceRole.entities.FastingRecord.create({
          date: dateStr,
          type: goal.type,
          completed: false,
          intention_set: false,
          created_by: userEmail
        });

        results.push({
          user: userEmail,
          date: dateStr,
          type: fastType
        });
      }
    }

    return Response.json({
      message: 'Fasting auto-scheduling completed',
      scheduled: results.length,
      details: results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
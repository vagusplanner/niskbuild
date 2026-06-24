import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_KEYS  = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function toISO(dateStr, timeStr) {
  // dateStr: "28 Mar 2026", timeStr: "05:12 (BST)" or "05:12"
  const clean = timeStr.replace(/\s*\(.*?\)/, '').trim();
  return new Date(`${dateStr} ${clean}`).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { latitude, longitude, days = 7 } = await req.json();
    if (!latitude || !longitude) {
      return Response.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    const createdEvents = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const timestamp = Math.floor(d.getTime() / 1000);

      // Fetch prayer times from Aladhan
      const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=2`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.code !== 200) {
        console.error('Aladhan error:', json);
        continue;
      }

      const timings = json.data.timings;
      const dateStr = json.data.date.readable; // e.g. "28 Mar 2026"

      for (const key of PRAYER_KEYS) {
        const timeStr = timings[key];
        if (!timeStr) continue;

        let startISO;
        try {
          startISO = toISO(dateStr, timeStr);
        } catch (_) {
          continue;
        }

        const start = new Date(startISO);
        if (isNaN(start.getTime())) continue;

        const end = new Date(start.getTime() + 20 * 60 * 1000); // 20 min duration

        // Check for existing event on same day with same title
        const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
        const dayEnd   = new Date(start); dayEnd.setHours(23,59,59,999);

        const existing = await base44.entities.Event.filter({
          title: `🕌 ${key}`,
          created_by: user.email,
        }, 'start_date', 5);

        const alreadyExists = existing.some(e => {
          const eDate = new Date(e.start_date);
          return eDate >= dayStart && eDate <= dayEnd;
        });

        if (alreadyExists) continue;

        const event = await base44.entities.Event.create({
          title: `🕌 ${key}`,
          description: `Daily ${key} prayer — auto-scheduled from your location`,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          category: 'prayer',
          is_all_day: false,
          reminders: [{ minutes_before: 5, type: 'notification', sent: false }],
          source: 'app',
          is_synced: false,
        });

        createdEvents.push({ prayer: key, date: dateStr, time: timeStr, id: event.id });
      }
    }

    return Response.json({ success: true, created: createdEvents.length, events: createdEvents });
  } catch (error) {
    console.error('prayerCalendarSync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_data, preferred_date } = await req.json();

    // Get user settings for prayer times
    const settings = await base44.entities.UserSettings.list();
    const userSettings = settings.find(s => s.created_by === user.email);

    // Prayer times (approximate - in production, fetch from API)
    const prayerTimes = {
      fajr: { hour: 5, minute: 30 },
      dhuhr: { hour: 12, minute: 30 },
      asr: { hour: 15, minute: 30 },
      maghrib: { hour: 18, minute: 0 },
      isha: { hour: 19, minute: 30 }
    };

    // Get existing events for conflict detection
    const events = await base44.entities.Event.filter({
      created_by: user.email
    });

    const baseDate = preferred_date ? new Date(preferred_date) : new Date();
    const duration = event_data.duration_minutes || 60;

    // Find optimal time avoiding prayers with 30-min buffer
    const findOptimalTime = (date) => {
      const day = new Date(date);
      const suggestions = [];

      // Generate potential time slots
      for (let hour = 8; hour < 22; hour++) {
        for (let minute of [0, 30]) {
          const slotStart = new Date(day);
          slotStart.setHours(hour, minute, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          // Check if conflicts with prayer times (with 30-min buffer)
          let conflictsWithPrayer = false;
          for (const [name, time] of Object.entries(prayerTimes)) {
            const prayerStart = new Date(day);
            prayerStart.setHours(time.hour, time.minute, 0, 0);
            const prayerEnd = new Date(prayerStart.getTime() + 30 * 60000); // 30 min prayer time
            
            // Add 30-min buffer before and after
            const bufferStart = new Date(prayerStart.getTime() - 30 * 60000);
            const bufferEnd = new Date(prayerEnd.getTime() + 30 * 60000);

            if (
              (slotStart >= bufferStart && slotStart < bufferEnd) ||
              (slotEnd > bufferStart && slotEnd <= bufferEnd) ||
              (slotStart <= bufferStart && slotEnd >= bufferEnd)
            ) {
              conflictsWithPrayer = true;
              break;
            }
          }

          if (conflictsWithPrayer) continue;

          // Check conflicts with existing events
          let conflictsWithEvent = false;
          for (const event of events) {
            const eventStart = new Date(event.start_date);
            const eventEnd = new Date(event.end_date);
            
            if (
              (slotStart >= eventStart && slotStart < eventEnd) ||
              (slotEnd > eventStart && slotEnd <= eventEnd) ||
              (slotStart <= eventStart && slotEnd >= eventEnd)
            ) {
              conflictsWithEvent = true;
              break;
            }
          }

          if (!conflictsWithEvent) {
            suggestions.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              score: calculateScore(slotStart, event_data.category)
            });
          }
        }
      }

      return suggestions.sort((a, b) => b.score - a.score);
    };

    const calculateScore = (time, category) => {
      let score = 100;
      const hour = time.getHours();

      // Prefer morning for personal/spiritual activities
      if (category === 'prayer' || category === 'personal') {
        if (hour >= 6 && hour < 9) score += 30;
      }

      // Prefer afternoon for work
      if (category === 'work') {
        if (hour >= 9 && hour < 17) score += 20;
      }

      // Prefer evening for family
      if (category === 'family') {
        if (hour >= 18 && hour < 21) score += 25;
      }

      return score;
    };

    const suggestions = findOptimalTime(baseDate);

    if (suggestions.length === 0) {
      // Try next day
      const nextDay = new Date(baseDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDaySuggestions = findOptimalTime(nextDay);
      
      return Response.json({
        success: true,
        suggested_start: nextDaySuggestions[0]?.start || baseDate.toISOString(),
        suggested_end: nextDaySuggestions[0]?.end || new Date(baseDate.getTime() + duration * 60000).toISOString(),
        prayer_aware: true,
        message: 'No slots today, suggested tomorrow'
      });
    }

    return Response.json({
      success: true,
      suggested_start: suggestions[0].start,
      suggested_end: suggestions[0].end,
      alternatives: suggestions.slice(1, 4),
      prayer_aware: true
    });

  } catch (error) {
    console.error('Error suggesting prayer-aware time:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prayer_times, buffer_minutes = 15, duration_minutes = 60, date } = await req.json();

    if (!prayer_times) {
      return Response.json({ error: 'Prayer times required' }, { status: 400 });
    }

    // Parse prayer times into time ranges to avoid
    const prayerBlocks = [];
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    for (const prayer of prayers) {
      const timeStr = prayer_times[prayer];
      if (!timeStr) continue;
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      const prayerMinutes = hours * 60 + minutes;
      
      prayerBlocks.push({
        name: prayer,
        start: prayerMinutes - buffer_minutes,
        end: prayerMinutes + (prayer === 'Fajr' ? 20 : 15) + buffer_minutes
      });
    }

    // Fetch existing events for the day
    const events = await base44.entities.Event.filter({
      start_date: { $gte: `${date}T00:00:00Z`, $lt: `${date}T23:59:59Z` }
    });

    // Convert events to time blocks
    const eventBlocks = events.map(e => {
      const start = new Date(e.start_date);
      const end = new Date(e.end_date);
      return {
        start: start.getHours() * 60 + start.getMinutes(),
        end: end.getHours() * 60 + end.getMinutes()
      };
    });

    // Working hours (9 AM - 9 PM)
    const workStart = 9 * 60; // 9 AM
    const workEnd = 21 * 60; // 9 PM

    // Find free slots
    const suggestions = [];
    let currentTime = workStart;

    while (currentTime + duration_minutes <= workEnd) {
      const slotEnd = currentTime + duration_minutes;
      
      // Check if slot conflicts with prayer
      const conflictsWithPrayer = prayerBlocks.some(p => 
        (currentTime >= p.start && currentTime < p.end) ||
        (slotEnd > p.start && slotEnd <= p.end) ||
        (currentTime <= p.start && slotEnd >= p.end)
      );

      // Check if slot conflicts with existing events
      const conflictsWithEvent = eventBlocks.some(e =>
        (currentTime >= e.start && currentTime < e.end) ||
        (slotEnd > e.start && slotEnd <= e.end) ||
        (currentTime <= e.start && slotEnd >= e.end)
      );

      if (!conflictsWithPrayer && !conflictsWithEvent) {
        const startHour = Math.floor(currentTime / 60);
        const startMin = currentTime % 60;
        const endHour = Math.floor(slotEnd / 60);
        const endMin = slotEnd % 60;
        
        const formatTime = (h, m) => {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
          return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
        };

        // Find next prayer
        const nextPrayer = prayerBlocks.find(p => p.start > slotEnd);
        const reason = nextPrayer 
          ? `${((nextPrayer.start - slotEnd) / 60).toFixed(0)} min before ${nextPrayer.name}`
          : 'No conflicts';

        suggestions.push({
          time_range: `${formatTime(startHour, startMin)} - ${formatTime(endHour, endMin)}`,
          start_minutes: currentTime,
          end_minutes: slotEnd,
          reason,
          quality: nextPrayer ? 'optimal' : 'good'
        });

        if (suggestions.length >= 5) break;
      }

      currentTime += 30; // Check every 30 min
    }

    return Response.json({ suggestions });
  } catch (error) {
    console.error('Prayer-aware scheduling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
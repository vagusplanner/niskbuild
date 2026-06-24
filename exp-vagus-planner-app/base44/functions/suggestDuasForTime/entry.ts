import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentHour = new Date().getHours();
    
    const timeBased = {
      fajr: { start: 4, end: 7, theme: 'morning', occasion: 'morning' },
      dhuhr: { start: 11, end: 15, theme: 'midday', occasion: 'after_prayer' },
      asr: { start: 15, end: 18, theme: 'afternoon', occasion: 'after_prayer' },
      maghrib: { start: 18, end: 20, theme: 'sunset', occasion: 'eating' },
      isha: { start: 20, end: 23, theme: 'night', occasion: 'before_sleep' }
    };

    let selectedOccasion = 'general';
    for (const [prayer, times] of Object.entries(timeBased)) {
      if (currentHour >= times.start && currentHour < times.end) {
        selectedOccasion = times.occasion;
        break;
      }
    }

    // Get relevant Du'as from database
    const duas = await base44.entities.DailyDua.filter({
      occasion: selectedOccasion
    });

    if (duas.length === 0) {
      return Response.json({ 
        duas: [],
        message: 'No specific duas found for this time'
      });
    }

    // Shuffle and return top 3
    const shuffled = duas.sort(() => 0.5 - Math.random());
    const suggested = shuffled.slice(0, 3);

    return Response.json({ 
      success: true,
      time_based_occasion: selectedOccasion,
      duas: suggested,
      message: `Found ${suggested.length} suggested duas for ${selectedOccasion}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
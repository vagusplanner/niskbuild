import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get all users with prayer times enabled
    const allSettings = await base44.asServiceRole.entities.UserSettings.filter({
      prayer_enabled: true
    });
    
    const eventsCreated = [];
    
    for (const settings of allSettings) {
      const userEmail = settings.created_by;
      if (!userEmail) continue;
      
      // Check if prayer events already exist for today - be more strict
      const startOfDay = `${todayStr}T00:00:00`;
      const endOfDay = `${todayStr}T23:59:59`;
      const existingPrayerEvents = await base44.asServiceRole.entities.Event.filter({
        created_by: userEmail,
        start_date: { $gte: startOfDay, $lte: endOfDay },
        category: 'prayer'
      });
      
      // Skip if ANY prayer events exist for today to prevent duplicates
      if (existingPrayerEvents.length > 0) {
        continue;
      }
      
      // Get prayer times for user's location using AlAdhan API
      const lat = settings.latitude || 51.5074;
      const lng = settings.longitude || -0.1278;
      const method = settings.prayer_method || 'MWL';
      
      const prayerTimes = await getPrayerTimes(today, lat, lng, method);
      if (!prayerTimes) {
        console.error(`Failed to fetch prayer times for ${userEmail}`);
        continue;
      }
      
      const prayers = [
        { name: 'Fajr', time: prayerTimes.Fajr, emoji: '🌅', color: '#6366f1' },
        { name: 'Dhuhr', time: prayerTimes.Dhuhr, emoji: '☀️', color: '#f59e0b' },
        { name: 'Asr', time: prayerTimes.Asr, emoji: '🌤️', color: '#f97316' },
        { name: 'Maghrib', time: prayerTimes.Maghrib, emoji: '🌆', color: '#ec4899' },
        { name: 'Isha', time: prayerTimes.Isha, emoji: '🌙', color: '#8b5cf6' }
      ];
      
      // Create calendar events for each prayer
      for (const prayer of prayers) {
        try {
          const [hours, minutes] = prayer.time.split(':').map(Number);
          const startDateTime = new Date(today);
          startDateTime.setHours(hours, minutes, 0);
          
          const endDateTime = new Date(startDateTime);
          endDateTime.setMinutes(endDateTime.getMinutes() + 15); // 15 min duration
          
          // Double-check this exact prayer doesn't exist (belt and suspenders)
          const exactMatch = await base44.asServiceRole.entities.Event.filter({
            created_by: userEmail,
            title: `${prayer.emoji} ${prayer.name} Prayer`,
            start_date: startDateTime.toISOString(),
            category: 'prayer'
          });
          
          if (exactMatch.length === 0) {
            await base44.asServiceRole.entities.Event.create({
              created_by: userEmail,
              title: `${prayer.emoji} ${prayer.name} Prayer`,
              description: `Prayer time - ${prayer.time}`,
              start_date: startDateTime.toISOString(),
              end_date: endDateTime.toISOString(),
              category: 'prayer',
              is_all_day: false,
              color: prayer.color,
              location: settings.location_city ? `${settings.location_city}, ${settings.location_country || ''}` : null
            });
            
            eventsCreated.push({
              user: userEmail,
              prayer: prayer.name,
              time: prayer.time
            });
          }
        } catch (error) {
          console.error(`Failed to create ${prayer.name} event for ${userEmail}:`, error);
        }
      }
    }
    
    return Response.json({
      message: 'Prayer events created',
      events_created: eventsCreated.length,
      details: eventsCreated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getPrayerTimes(date, latitude, longitude, method) {
  try {
    const timestamp = Math.floor(date.getTime() / 1000);
    const methodNum = getMethodNumber(method);
    
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${latitude}&longitude=${longitude}&method=${methodNum}`
    );
    
    if (!response.ok) throw new Error('Prayer API failed');
    
    const data = await response.json();
    const timings = data.data.timings;
    
    return {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha
    };
  } catch (error) {
    console.error('Prayer times error:', error);
    return null;
  }
}

function getMethodNumber(method) {
  const methods = {
    'MWL': 3,
    'ISNA': 2,
    'Egypt': 5,
    'Makkah': 4,
    'Karachi': 1,
    'Tehran': 7,
    'Jafari': 0
  };
  return methods[method] || 3;
}
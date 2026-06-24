import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all users with Islamic mode enabled
    const users = await base44.asServiceRole.entities.User.list();
    const settings = await base44.asServiceRole.entities.UserSettings.list();

    const islamicUsers = settings.filter(s => 
      s.islamic_mode && s.latitude && s.longitude
    );

    let totalBlocked = 0;

    for (const userSetting of islamicUsers) {
      try {
        // Fetch prayer times for this user
        const prayerRes = await base44.asServiceRole.functions.invoke('fetchPrayerTimes', {
          latitude: userSetting.latitude,
          longitude: userSetting.longitude,
          method: userSetting.prayer_method || 'MWL'
        });

        const prayerData = prayerRes.data;
        if (!prayerData?.timings) continue;

        // Get user's existing prayer events for today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const existingEvents = await base44.asServiceRole.entities.Event.filter({
          created_by: userSetting.created_by,
          category: 'prayer',
          start_date: { $gte: `${todayStr}T00:00:00Z`, $lt: `${todayStr}T23:59:59Z` }
        });

        const existingPrayers = existingEvents.map(e => 
          e.title?.toLowerCase().replace(' prayer', '')
        );

        // Create missing prayer blocks
        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        const events = [];

        for (const prayer of prayers) {
          if (existingPrayers.includes(prayer)) continue;

          const timeStr = prayerData.timings[prayer.charAt(0).toUpperCase() + prayer.slice(1)];
          if (!timeStr) continue;

          const [hours, minutes] = timeStr.split(':').map(Number);
          const startDate = new Date(today);
          startDate.setHours(hours, minutes, 0, 0);
          
          const endDate = new Date(startDate);
          endDate.setMinutes(endDate.getMinutes() + (prayer === 'fajr' ? 20 : 15));

          events.push({
            title: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} Prayer`,
            description: 'Automated prayer time block',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            is_all_day: false,
            category: 'prayer',
            color: '#9333ea',
            created_by: userSetting.created_by
          });
        }

        if (events.length > 0) {
          await base44.asServiceRole.entities.Event.bulkCreate(events);
          totalBlocked += events.length;
        }
      } catch (error) {
        console.error(`Failed for user ${userSetting.created_by}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      users_processed: islamicUsers.length,
      prayers_blocked: totalBlocked
    });
  } catch (error) {
    console.error('Auto prayer scheduler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
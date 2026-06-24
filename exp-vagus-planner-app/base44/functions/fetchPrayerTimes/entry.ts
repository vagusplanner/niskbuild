import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let payload = {};
    try {
      payload = await req.json();
    } catch (e) {
      // Empty payload is fine
    }
    
    const user_email = payload.user_email;
    const date = payload.date || new Date().toISOString().split('T')[0];
    
    // If no user_email, fetch for all users
    if (!user_email) {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const results = [];
      
      for (const user of allUsers) {
        try {
          const result = await fetchUserPrayerTimes(base44, user.email, date);
          results.push({ user: user.email, success: true, ...result });
        } catch (error) {
          results.push({ user: user.email, success: false, error: error.message });
        }
      }
      
      return Response.json({
        success: true,
        processed: results.length,
        results
      });
    }
    
    // Single user
    const result = await fetchUserPrayerTimes(base44, user_email, date);
    return Response.json(result);
    
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchUserPrayerTimes(base44, user_email, date) {
  // Get user settings for location and prayer method
  const userSettings = await base44.asServiceRole.entities.UserSettings.filter({
    created_by: user_email
  });
  
  const settings = userSettings[0];
  if (!settings) {
    return { success: false, error: 'User settings not found' };
  }
  
  const { latitude, longitude, prayer_method, timezone } = settings;
  
  if (!latitude || !longitude) {
    return { success: false, error: 'User location not configured' };
  }
  
  // Aladhan API - Free Islamic prayer times API
  const method = prayer_method || 'MWL';
  const methodMap = {
    'MWL': 3, // Muslim World League
    'ISNA': 2, // Islamic Society of North America
    'Egypt': 5, // Egyptian General Authority of Survey
    'Makkah': 4, // Umm Al-Qura University, Makkah
    'Karachi': 1, // University of Islamic Sciences, Karachi
    'Tehran': 7, // Institute of Geophysics, University of Tehran
    'Jafari': 0  // Shia Ithna-Ashari, Leva Institute, Qum
  };
  
  const methodNum = methodMap[method] || 3;
  
  // Convert date format for API (DD-MM-YYYY)
  const [year, month, day] = date.split('-');
  const apiDate = `${day}-${month}-${year}`;
  
  const apiUrl = `http://api.aladhan.com/v1/timings/${apiDate}?latitude=${latitude}&longitude=${longitude}&method=${methodNum}`;
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  if (data.code !== 200 || !data.data) {
    return { success: false, error: 'Failed to fetch prayer times' };
  }
  
  const timings = data.data.timings;
  
  // Parse times and convert to user's timezone
  // Helper: add minutes to HH:MM string
  const addMinutes = (timeStr, mins) => {
    if (!timeStr || !mins) return timeStr;
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
    const nm = ((total % 1440) + 1440) % 1440 % 60;
    return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
  };

  // Apply user offsets or manual overrides if configured
  const offsets   = settings.prayer_time_offsets   || {};
  const overrides = settings.prayer_time_overrides  || {};
  const useManual = settings.use_manual_prayer_times === true;

  const resolveTime = (prayer, apiTime) => {
    if (useManual && overrides[prayer]) return overrides[prayer];
    const offset = Number(offsets[prayer] || 0);
    return addMinutes(apiTime, offset);
  };

  const prayerTimes = {
    fajr:     resolveTime('fajr',    timings.Fajr),
    sunrise:  timings.Sunrise,
    dhuhr:    resolveTime('dhuhr',   timings.Dhuhr),
    asr:      resolveTime('asr',     timings.Asr),
    maghrib:  resolveTime('maghrib', timings.Maghrib),
    isha:     resolveTime('isha',    timings.Isha),
    midnight: timings.Midnight,
    imsak:    timings.Imsak,
    date:     date,
    using_manual: useManual
  };
  
  // Store in user settings for quick access
  await base44.asServiceRole.entities.UserSettings.update(settings.id, {
    prayer_times_cache: prayerTimes,
    prayer_times_cache_date: date
  });
  
  // Create prayer time events if prayer_enabled
  if (settings.prayer_enabled) {
    const prayerNames = {
      fajr: 'Fajr Prayer',
      dhuhr: 'Dhuhr Prayer',
      asr: 'Asr Prayer',
      maghrib: 'Maghrib Prayer',
      isha: 'Isha Prayer'
    };
    
    for (const [prayer, name] of Object.entries(prayerNames)) {
      const time = prayerTimes[prayer];
      if (!time) continue;
      
      // Check if event already exists
      const existing = await base44.asServiceRole.entities.Event.filter({
        title: name,
        start_date: { $gte: `${date}T00:00:00`, $lt: `${date}T23:59:59` },
        created_by: user_email
      });
      
      if (existing.length === 0) {
        // Create prayer event
        const [hours, minutes] = time.split(':');
        const startDateTime = new Date(`${date}T${hours}:${minutes}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 15 * 60000); // 15 min duration
        
        await base44.asServiceRole.entities.Event.create({
          title: name,
          description: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer time`,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          is_all_day: false,
          category: 'prayer',
          color: '#10b981',
          reminders: [{
            minutes_before: 10,
            type: 'notification',
            sent: false
          }],
          source: 'app',
          created_by: user_email
        });
      }
    }
  }
  
  return {
    success: true,
    prayer_times: prayerTimes,
    location: { latitude, longitude },
    method
  };
}
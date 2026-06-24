/**
 * getPrayerTimesForUser
 * Fetches today's prayer times for the authenticated user's saved location.
 * Uses AlAdhan API (free, no key needed).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const METHOD_MAP = {
  MWL: 3, ISNA: 2, Egypt: 5, Makkah: 4, Karachi: 1, Tehran: 7, Jafari: 0
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load user settings
    const settingsList = await base44.entities.UserSettings.filter({ created_by: user.email });
    const settings = settingsList[0] || {};

    const lat = settings.latitude;
    const lng = settings.longitude;

    if (!lat || !lng) {
      return Response.json({ error: 'No location saved. Please set your location in Settings → Prayer Settings.' }, { status: 422 });
    }

    const method = METHOD_MAP[settings.prayer_method] ?? 3;
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AlAdhan API error: ${res.status}`);
    const data = await res.json();

    if (data.code !== 200) throw new Error('AlAdhan returned non-200 code');

    const timings = data.data.timings;
    // Return only the 5 fard prayers + Sunrise
    const prayers = {
      Fajr:    timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhr:   timings.Dhuhr,
      Asr:     timings.Asr,
      Maghrib: timings.Maghrib,
      Isha:    timings.Isha,
    };

    // Apply user-defined offsets (minutes)
    const offsets = settings.prayer_time_offsets || {};
    const adjustedPrayers = {};
    for (const [name, time] of Object.entries(prayers)) {
      if (!time) continue;
      const [h, m] = time.split(':').map(Number);
      const offsetMin = offsets[name.toLowerCase()] || 0;
      const total = h * 60 + m + offsetMin;
      const adjH = Math.floor(((total % 1440) + 1440) % 1440 / 60);
      const adjM = ((total % 1440) + 1440) % 1440 % 60;
      adjustedPrayers[name] = `${String(adjH).padStart(2, '0')}:${String(adjM).padStart(2, '0')}`;
    }

    return Response.json({
      prayers: adjustedPrayers,
      location: {
        city: settings.location_city || 'Your Location',
        country: settings.location_country || '',
        lat,
        lng,
      },
      method: settings.prayer_method || 'MWL',
      date: dateStr,
    });
  } catch (err) {
    console.error('[getPrayerTimesForUser]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
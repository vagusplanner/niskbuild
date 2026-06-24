import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Calculate prayer times using the adhan algorithm
// Simplified but accurate enough for notification scheduling
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
function fixHour(h) { return h - 24 * Math.floor(h / 24); }

function julianDate(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function sunPosition(jd) {
  const D = jd - 2451545;
  const g = toRad(357.529 + 0.98560028 * D);
  const q = 280.459 + 0.98564736 * D;
  const L = toRad(q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const e = toRad(23.439 - 0.00000036 * D);
  const RA = toDeg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15;
  const eqt = q / 15 - fixHour(RA);
  const dec = toDeg(Math.asin(Math.sin(e) * Math.sin(L)));
  return { dec, eqt };
}

function computePrayerTimes(lat, lng, timezone, date, method = 'MWL') {
  const METHODS = {
    MWL:   { fajr: 18,   isha: 17 },
    ISNA:  { fajr: 15,   isha: 15 },
    Egypt: { fajr: 19.5, isha: 17.5 },
    Makkah:{ fajr: 18.5, isha: 90 }, // 90 mins after Maghrib
    Karachi:{ fajr: 18,  isha: 18 },
    Tehran:{ fajr: 17.7, isha: 14 },
    Jafari:{ fajr: 16,   isha: 14 }
  };
  const m = METHODS[method] || METHODS.MWL;

  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const { dec, eqt } = sunPosition(jd);

  const longDiff = lng / 15;
  const decR = toRad(dec);
  const latR = toRad(lat);

  // Mid-day
  const Dhuhr = 12 - eqt - longDiff + timezone;

  // Sun angle to time interval
  function sunAngleTime(angle) {
    const t = -Math.sin(toRad(angle)) - Math.sin(latR) * Math.sin(decR);
    const cos = Math.cos(latR) * Math.cos(decR);
    return (1 / 15) * toDeg(Math.acos(t / cos));
  }

  // Asr (Shafi = 1, Hanafi = 2)
  function asrTime(factor) {
    const target = toDeg(Math.atan(1 / (factor + Math.tan(Math.abs(lat - dec) * Math.PI / 180))));
    return Dhuhr + sunAngleTime(target);
  }

  const Fajr    = Dhuhr - sunAngleTime(m.fajr);
  const Sunrise = Dhuhr - sunAngleTime(0.833);
  const Asr     = asrTime(1);
  const Maghrib = Dhuhr + sunAngleTime(0.833);
  const Isha    = m.isha > 60
    ? Maghrib + m.isha / 60
    : Dhuhr + sunAngleTime(m.isha);

  function toHHMM(t) {
    t = fixHour(t);
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    const hh = m >= 60 ? h + 1 : h;
    const mm = m >= 60 ? 0 : m;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  return [
    { name: 'Fajr',    time: toHHMM(Fajr) },
    { name: 'Dhuhr',   time: toHHMM(Dhuhr) },
    { name: 'Asr',     time: toHHMM(Asr) },
    { name: 'Maghrib', time: toHHMM(Maghrib) },
    { name: 'Isha',    time: toHHMM(Isha) }
  ];
}

function getTimezoneOffsetHours(tzName) {
  try {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tzName }));
    return (tzDate - new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))) / 3600000;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const allSettings = await base44.asServiceRole.entities.UserSettings.list();
    const usersWithPrayer = allSettings.filter(s =>
      s.prayer_enabled && s.notifications_enabled && s.created_by
    );

    let scheduled = 0;
    let skipped = 0;

    for (const settings of usersWithPrayer) {
      const userEmail = settings.created_by;

      // Dedup: skip if prayer notifications already scheduled for today for this user
      const existing = await base44.asServiceRole.entities.Notification.filter({
        user_email: userEmail,
        type: 'prayer'
      });

      const alreadyScheduledToday = existing.some(n => {
        const createdDate = new Date(n.created_date).toISOString().split('T')[0];
        return createdDate === today;
      });

      if (alreadyScheduledToday) {
        console.log(`Prayer notifications already scheduled today for ${userEmail}, skipping`);
        skipped++;
        continue;
      }

      // Use user's saved coordinates, fall back to London
      const lat = settings.latitude || 51.5074;
      const lng = settings.longitude || -0.1278;
      const tzName = settings.timezone || 'Europe/London';
      const tzOffset = getTimezoneOffsetHours(tzName);
      const method = settings.prayer_method || 'MWL';
      const notifyBefore = settings.notify_before_minutes || 15;
      const offsets = settings.prayer_time_offsets || {};
      const overrides = settings.use_manual_prayer_times ? (settings.prayer_time_overrides || {}) : {};

      const prayerTimes = computePrayerTimes(lat, lng, tzOffset, now, method);

      for (const prayer of prayerTimes) {
        let prayerTime = overrides[prayer.name.toLowerCase()] || prayer.time;
        
        // Apply user offset in minutes
        const offsetMin = offsets[prayer.name.toLowerCase()] || 0;
        if (offsetMin !== 0) {
          const [h, m] = prayerTime.split(':').map(Number);
          const totalMin = h * 60 + m + offsetMin;
          const adjH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
          const adjM = ((totalMin % 1440) + 1440) % 1440 % 60;
          prayerTime = `${String(adjH).padStart(2, '0')}:${String(adjM).padStart(2, '0')}`;
        }

        // Schedule notification for notify_before_minutes before prayer
        const [ph, pm] = prayerTime.split(':').map(Number);
        const totalMin = ph * 60 + pm - notifyBefore;
        const notifyH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
        const notifyM = ((totalMin % 1440) + 1440) % 1440 % 60;
        const notifyTime = `${String(notifyH).padStart(2, '0')}:${String(notifyM).padStart(2, '0')}`;

        await base44.asServiceRole.entities.Notification.create({
          user_email: userEmail,
          type: 'prayer',
          title: `🕌 ${prayer.name} Prayer Time`,
          message: `${prayer.name} prayer is in ${notifyBefore} minutes (${prayerTime})`,
          priority: 'high',
          is_read: false,
          scheduled_for: `${today}T${notifyTime}:00`,
          metadata: {
            prayer_name: prayer.name,
            prayer_time: prayerTime,
            action: 'mark_performed',
            action_label: 'Mark as Performed',
            action_url: '/Islam',
            latitude: lat,
            longitude: lng
          }
        });
        scheduled++;
      }
      console.log(`Scheduled ${prayerTimes.length} prayer notifications for ${userEmail} (lat:${lat}, lng:${lng})`);
    }

    return Response.json({
      success: true,
      scheduled,
      skipped,
      message: `Scheduled ${scheduled} prayer notifications, skipped ${skipped} users (already done today)`
    });

  } catch (error) {
    console.error('Error scheduling prayer notifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
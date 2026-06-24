/**
 * Prayer Engine — centralized prayer time calculation & reminder scheduling
 * Uses AlAdhan API (api.aladhan.com) with local fallback.
 * Supports all 7 major calculation methods + Asr juristic variants + tune offsets.
 */

export const CALCULATION_METHODS = [
  { value: 'MWL',      num: 3,  label: 'Muslim World League',                   region: 'Europe, Far East, parts of USA' },
  { value: 'ISNA',     num: 2,  label: 'Islamic Society of North America',       region: 'North America' },
  { value: 'Egypt',    num: 5,  label: 'Egyptian General Authority of Survey',   region: 'Africa, Syria, Lebanon, Malaysia' },
  { value: 'Makkah',   num: 4,  label: 'Umm Al-Qura University, Makkah',         region: 'Arabian Peninsula' },
  { value: 'Karachi',  num: 1,  label: 'University of Islamic Sciences, Karachi',region: 'Pakistan, Bangladesh, India, Afghanistan' },
  { value: 'Tehran',   num: 7,  label: 'Institute of Geophysics, Tehran',        region: 'Iran, Some Shia Communities' },
  { value: 'Jafari',   num: 0,  label: 'Shia Ithna-Ashari (Jafari)',            region: 'Shia communities worldwide' },
  { value: 'Gulf',     num: 8,  label: 'Gulf Region',                            region: 'Gulf States' },
  { value: 'Kuwait',   num: 9,  label: 'Kuwait',                                 region: 'Kuwait' },
  { value: 'Qatar',    num: 10, label: 'Qatar',                                  region: 'Qatar' },
  { value: 'Singapore',num: 11, label: 'Majlis Ugama Islam Singapura',           region: 'Singapore' },
  { value: 'France',   num: 12, label: 'Union Organisation islamique de France', region: 'France' },
  { value: 'Turkey',   num: 13, label: 'Diyanet İşleri Başkanlığı',             region: 'Turkey' },
  { value: 'Russia',   num: 14, label: 'Spiritual Administration of Muslims',    region: 'Russia' },
  { value: 'Moonsighting', num: 15, label: 'Moonsighting Committee Worldwide',   region: 'Global – Moonsighting' },
  { value: 'Dubai',    num: 16, label: 'Dubai',                                  region: 'Dubai, UAE' },
];

export const ASR_METHODS = [
  { value: '0', label: 'Standard (Shafi\'i, Maliki, Hanbali)' },
  { value: '1', label: 'Hanafi' },
];

export const PRAYER_DISPLAY = [
  { key: 'Fajr',    emoji: '🌅', label: 'Fajr',    colorFrom: '#6366f1', colorTo: '#8b5cf6' },
  { key: 'Dhuhr',   emoji: '☀️', label: 'Dhuhr',   colorFrom: '#f59e0b', colorTo: '#f97316' },
  { key: 'Asr',     emoji: '🌤️', label: 'Asr',     colorFrom: '#fb923c', colorTo: '#ef4444' },
  { key: 'Maghrib', emoji: '🌆', label: 'Maghrib', colorFrom: '#f43f5e', colorTo: '#ec4899' },
  { key: 'Isha',    emoji: '🌙', label: 'Isha',    colorFrom: '#8b5cf6', colorTo: '#4338ca' },
];

// ── Cache ─────────────────────────────────────────────────────────────────────
const _cache = {};

function cacheKey(date, lat, lng, methodNum, asrMethod, offsets) {
  const d = date.toISOString().split('T')[0];
  const off = Object.values(offsets || {}).join(',');
  return `${d}|${lat.toFixed(4)}|${lng.toFixed(4)}|${methodNum}|${asrMethod}|${off}`;
}

// ── Fallback approximate times ────────────────────────────────────────────────
function fallbackTimes(date) {
  const m = date.getMonth();
  const adj = Math.sin((m - 3) * Math.PI / 6) * 1.5;
  const fmt = (h) => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  };
  return {
    Fajr:    fmt(5.0  - adj * 0.8),
    Dhuhr:   fmt(12.0),
    Asr:     fmt(15.0 + adj * 0.3),
    Maghrib: fmt(18.0 + adj),
    Isha:    fmt(20.0 + adj * 0.8),
  };
}

// ── Apply minute offsets ──────────────────────────────────────────────────────
export function applyOffsets(times, offsets = {}) {
  const result = {};
  for (const [prayer, time] of Object.entries(times)) {
    const offset = offsets[prayer.toLowerCase()] || offsets[prayer] || 0;
    if (!offset) { result[prayer] = time; continue; }
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + offset;
    if (total < 0) total += 1440;
    if (total >= 1440) total -= 1440;
    result[prayer] = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }
  return result;
}

// ── Main fetch ─────────────────────────────────────────────────────────────────
export async function fetchPrayerTimes(date, lat, lng, method = 'MWL', asrMethod = '0', offsets = {}) {
  const methodObj = CALCULATION_METHODS.find(m => m.value === method) || CALCULATION_METHODS[0];
  const methodNum = methodObj.num;
  const key = cacheKey(date, lat, lng, methodNum, asrMethod, offsets);

  if (_cache[key]) return _cache[key];

  try {
    const ts = Math.floor(date.getTime() / 1000);
    const url = `https://api.aladhan.com/v1/timings/${ts}?latitude=${lat}&longitude=${lng}&method=${methodNum}&school=${asrMethod}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const json = await res.json();
    const t = json.data.timings;
    const raw = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };
    const result = applyOffsets(raw, offsets);
    _cache[key] = result;
    return result;
  } catch {
    return applyOffsets(fallbackTimes(date), offsets);
  }
}

// ── Next prayer helper ────────────────────────────────────────────────────────
export function getNextPrayer(times) {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const p of PRAYER_DISPLAY) {
    if (!times[p.key]) continue;
    const [h, m] = times[p.key].split(':').map(Number);
    if (h * 60 + m > cur) return p.key;
  }
  return 'Fajr';
}

export function minutesUntil(time) {
  if (!time) return null;
  const now = new Date();
  const [h, m] = time.split(':').map(Number);
  const diff = h * 60 + m - (now.getHours() * 60 + now.getMinutes());
  return diff < 0 ? diff + 1440 : diff;
}

export function formatCountdown(mins) {
  if (mins == null) return '';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Geocode city name → lat/lng ───────────────────────────────────────────────
export async function geocodeCity(cityName) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=5`);
  const data = await res.json();
  return data.map(r => ({
    name: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

// ── Browser notification scheduler ───────────────────────────────────────────
const _scheduledTimers = {};

export function schedulePrayerReminders(times, config) {
  // Clear existing
  Object.values(_scheduledTimers).forEach(clearTimeout);
  Object.keys(_scheduledTimers).forEach(k => delete _scheduledTimers[k]);

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = new Date();

  for (const prayer of PRAYER_DISPLAY) {
    const cfg = config[prayer.key] || {};
    if (!cfg.enabled) continue;

    const time = times[prayer.key];
    if (!time) continue;

    const [h, m] = time.split(':').map(Number);
    const prayerMs = new Date().setHours(h, m, 0, 0);
    const alertMs = prayerMs - (parseInt(cfg.minutesBefore || '10') * 60000);
    const msUntil = alertMs - Date.now();

    if (msUntil > 0 && msUntil < 86400000) {
      _scheduledTimers[prayer.key] = setTimeout(() => {
        const minsText = parseInt(cfg.minutesBefore) === 0 ? '' : ` in ${cfg.minutesBefore} minutes`;
        new Notification(`${prayer.emoji} ${prayer.key} Prayer${minsText}`, {
          body: `${prayer.key} is at ${time}`,
          icon: '/favicon.ico',
          tag: `prayer-${prayer.key}`,
          silent: cfg.sound === 'none',
        });
      }, msUntil);
    }
  }
}
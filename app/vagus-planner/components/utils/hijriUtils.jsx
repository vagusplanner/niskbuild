// Hijri calendar conversion — offline-first with optional API refresh
let hijriCache = {};
// Clear stale cache on module load so fixes apply immediately
if (typeof sessionStorage !== 'undefined') {
  Object.keys(sessionStorage).filter(k => k.startsWith('hijri_')).forEach(k => sessionStorage.removeItem(k));
}

export async function toHijri(gregorianDate) {
  if (!gregorianDate) return toHijriApproximate(new Date());
  const date = new Date(gregorianDate);
  if (isNaN(date.getTime())) return toHijriApproximate(new Date());
  const dateString = date.toISOString().split('T')[0];

  // Return cached result immediately (no network call needed each render)
  if (hijriCache[dateString]) return hijriCache[dateString];

  // Always compute offline first — fast and reliable
  const approx = toHijriApproximate(date);
  hijriCache[dateString] = approx;

  // Try API in the background (only once per session per date), update cache if successful
  const sessionKey = `hijri_${dateString}`;
  if (!sessionStorage.getItem(sessionKey)) {
    sessionStorage.setItem(sessionKey, '1');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const [year, month, day] = dateString.split('-');
      const response = await fetch(
        `https://api.aladhan.com/v1/gToH/${day}-${month}-${year}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        const hijri = data.data.hijri;
        hijriCache[dateString] = {
          day: parseInt(hijri.day),
          month: parseInt(hijri.month.number),
          monthName: hijri.month.en,
          year: parseInt(hijri.year)
        };
      }
    } catch (_e) {
      // Silently fall back to approximate — no console spam
    }
  }

  return hijriCache[dateString];
}

// Fallback approximate calculation
// Calibrated to 22 March 2026 = 3 Shawwal 1447 AH
// Using the Tabular Islamic Calendar (civil calculation, epoch 16 July 622 CE = 1 Muharram 1 AH)
function toHijriApproximate(date) {
  const monthNames = [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'
  ];

  // Julian Day Number of the input date
  // +1 correction: tabular calendar runs 1 day behind observed crescent moon calendar
  const jd = Math.floor(date.getTime() / 86400000) + 2440587.5 + 1;

  // Convert JDN to Hijri using standard algorithm (Fātimid / tabular calendar)
  const l = Math.floor(jd) - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
            Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
             Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hijriMonth = Math.floor((24 * l3) / 709);
  const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  const m = Math.max(1, Math.min(12, hijriMonth));
  return {
    day: hijriDay,
    month: m,
    monthName: monthNames[m - 1],
    year: hijriYear
  };
}

// Convert Hijri to Gregorian date
export async function toGregorian(hijriYear, hijriMonth, hijriDay) {
  try {
    // Use AlAdhan API for accurate conversion
    const response = await fetch(
      `https://api.aladhan.com/v1/hToG/${hijriDay}-${hijriMonth}-${hijriYear}`
    );
    
    if (!response.ok) throw new Error('API failed');
    
    const data = await response.json();
    const gregorian = data.data.gregorian;
    
    // Return Date object
    return new Date(
      parseInt(gregorian.year),
      parseInt(gregorian.month.number) - 1,
      parseInt(gregorian.day)
    );
  } catch (error) {
    console.error('Gregorian conversion error:', error);
    // Fallback to approximate calculation
    const daysInHijriYear = 354;
    const daysSinceHijriStart = (hijriYear - 1) * daysInHijriYear + 
                                 (hijriMonth - 1) * 29.5 + 
                                 hijriDay;
    
    const hijriStart = new Date(622, 6, 16);
    const gregorianDate = new Date(hijriStart.getTime() + daysSinceHijriStart * 24 * 60 * 60 * 1000);
    return gregorianDate;
  }
}
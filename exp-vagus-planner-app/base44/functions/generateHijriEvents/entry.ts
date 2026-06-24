import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Hijri to Gregorian conversion (Umm al-Qura approximation)
// Using the Meeus algorithm adapted for Islamic calendar
function hijriToGregorian(hy, hm, hd) {
  // Using astronomical calculation
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm
    - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;

  const l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  const ll = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (ll + 1)) / 1461001);
  const lll = ll - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * lll) / 2447);
  const day = lll - Math.floor((2447 * j) / 80);
  const llll = Math.floor(j / 11);
  const month = j + 2 - 12 * llll;
  const year = 100 * (n - 49) + i + llll;

  return { year, month, day };
}

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(g) { return `${g.year}-${pad(g.month)}-${pad(g.day)}`; }
function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Get current Hijri year from a Gregorian date
function getHijriYear(gregorianDate) {
  const gYear = gregorianDate.getFullYear();
  // Approximate: Hijri year from Gregorian
  return Math.floor((gYear - 622) * (33 / 32)) + 1;
}

function getMajorIslamicDates(hijriYear) {
  const events = [];

  // 1 Muharram — Islamic New Year
  const newYear = hijriToGregorian(hijriYear, 1, 1);
  events.push({
    key: 'new_year',
    name: 'Islamic New Year',
    arabic: 'رأس السنة الهجرية',
    hijri: `1 Muharram ${hijriYear}H`,
    start: toISO(newYear),
    end: toISO(newYear),
    duration_days: 1,
    category: 'holiday',
    color: '#6366f1',
    emoji: '🌙',
    description: 'The first day of Muharram marks the beginning of the Hijri New Year. A time for reflection, renewal of intentions, and setting spiritual goals.',
    devotional_suggestions: [
      'Fast on the 9th and 10th of Muharram (Ashura)',
      'Recite Surah Al-Fatiha 40 times',
      'Make dua for a blessed year',
      'Renew your Quran reading goals'
    ],
    sadaqah_suggestions: ['Donate to orphan care', 'Feed a family in need'],
    is_fasting_day: false,
    is_multi_day: false,
  });

  // 10 Muharram — Ashura
  const ashura = hijriToGregorian(hijriYear, 1, 10);
  events.push({
    key: 'ashura',
    name: "Day of Ashura",
    arabic: 'عاشوراء',
    hijri: `10 Muharram ${hijriYear}H`,
    start: toISO(ashura),
    end: toISO(ashura),
    duration_days: 1,
    category: 'holiday',
    color: '#0891b2',
    emoji: '💧',
    description: "The 10th of Muharram. The Prophet (ﷺ) said: 'Fasting on Ashura expiates the sins of the previous year.' Fast the 9th and 10th together.",
    devotional_suggestions: [
      'Fast on the 9th and 10th of Muharram',
      'Increase dhikr and salawat',
      'Recite Ayat al-Kursi 100 times',
      'Visit the sick or elderly'
    ],
    sadaqah_suggestions: ['Give to a food bank', 'Sponsor an iftar for a fasting person'],
    is_fasting_day: true,
    is_multi_day: false,
  });

  // 12 Rabi al-Awwal — Mawlid al-Nabi
  const mawlid = hijriToGregorian(hijriYear, 3, 12);
  events.push({
    key: 'mawlid',
    name: "Mawlid al-Nabi",
    arabic: 'المولد النبوي الشريف',
    hijri: `12 Rabi' al-Awwal ${hijriYear}H`,
    start: toISO(mawlid),
    end: toISO(mawlid),
    duration_days: 1,
    category: 'holiday',
    color: '#f59e0b',
    emoji: '⭐',
    description: "The birth anniversary of the Prophet Muhammad (ﷺ). A day to increase salawat, study his seerah, and practice his Sunnah.",
    devotional_suggestions: [
      'Read 100 salawat upon the Prophet ﷺ',
      'Study the Seerah (biography)',
      'Teach children about the Prophet ﷺ',
      'Implement a Sunnah habit this week'
    ],
    sadaqah_suggestions: ['Donate books on seerah', 'Fund an Islamic education program'],
    is_fasting_day: false,
    is_multi_day: false,
  });

  // Laylat al-Miraj — 27 Rajab
  const miraj = hijriToGregorian(hijriYear, 7, 27);
  events.push({
    key: 'miraj',
    name: "Laylat al-Miraj",
    arabic: 'ليلة المعراج',
    hijri: `27 Rajab ${hijriYear}H`,
    start: toISO(miraj),
    end: toISO(miraj),
    duration_days: 1,
    category: 'prayer',
    color: '#7c3aed',
    emoji: '🌠',
    description: "The Night Journey and Ascension of the Prophet Muhammad (ﷺ) — the night the 5 daily prayers were ordained.",
    devotional_suggestions: [
      'Pray all 5 obligatory prayers on time',
      'Pray 2 rakah nafl',
      'Reflect on the importance of salah',
      'Read Surah Al-Isra'
    ],
    sadaqah_suggestions: ['Contribute to mosque renovation', 'Support an Islamic charity'],
    is_fasting_day: false,
    is_multi_day: false,
  });

  // Laylat al-Bara'ah — 15 Sha'ban
  const baraat = hijriToGregorian(hijriYear, 8, 15);
  events.push({
    key: 'baraat',
    name: "Laylat al-Bara'ah",
    arabic: 'ليلة البراءة',
    hijri: `15 Sha'ban ${hijriYear}H`,
    start: toISO(baraat),
    end: toISO(baraat),
    duration_days: 1,
    category: 'prayer',
    color: '#0d9488',
    emoji: '🌸',
    description: "The Night of Forgiveness in mid-Sha'ban. Many scholars recommend spending the night in worship and seeking forgiveness.",
    devotional_suggestions: [
      'Pray tahajjud and seek forgiveness',
      'Perform 100 rakah of nafl prayer (optional)',
      'Make dua for deceased family members',
      'Recite Surah Yasin'
    ],
    sadaqah_suggestions: ['Give to the poor in your community', 'Fund meals for needy families'],
    is_fasting_day: false,
    is_multi_day: false,
  });

  // Ramadan — 1 Ramadan to 29/30 Ramadan
  const ramadanStart = hijriToGregorian(hijriYear, 9, 1);
  const ramadanEnd = hijriToGregorian(hijriYear, 9, 29);
  events.push({
    key: 'ramadan',
    name: 'Ramadan',
    arabic: 'شهر رمضان المبارك',
    hijri: `1-29 Ramadan ${hijriYear}H`,
    start: toISO(ramadanStart),
    end: toISO(ramadanEnd),
    duration_days: 29,
    category: 'holiday',
    color: '#d97706',
    emoji: '🌙',
    description: "The blessed month of fasting. Muslims fast from dawn to sunset, increase Quran recitation, prayer, dhikr, and charitable giving.",
    devotional_suggestions: [
      'Complete the full Quran this month',
      'Pray 5 prayers + Tarawih nightly',
      'Give daily Sadaqah',
      'Memorize new duas and surahs'
    ],
    sadaqah_suggestions: ['Pay Zakat al-Mal', 'Sponsor daily iftars', 'Donate to food banks'],
    is_fasting_day: true,
    is_multi_day: true,
  });

  // Laylat al-Qadr — 27 Ramadan (most likely)
  const qadr = hijriToGregorian(hijriYear, 9, 27);
  events.push({
    key: 'laylat_qadr',
    name: "Laylat al-Qadr",
    arabic: 'ليلة القدر',
    hijri: `27 Ramadan ${hijriYear}H (most likely)`,
    start: toISO(qadr),
    end: toISO(qadr),
    duration_days: 1,
    category: 'prayer',
    color: '#a855f7',
    emoji: '✨',
    description: "The Night of Power — better than a thousand months (Quran 97:3). Seek it in the last 10 odd nights of Ramadan.",
    devotional_suggestions: [
      "Recite: 'Allahumma innaka afuwwun tuhibbul afwa fa'fu anni' frequently",
      'Pray all night if possible',
      'Make comprehensive dua for all Muslims',
      'Give the most generous Sadaqah of the year'
    ],
    sadaqah_suggestions: ['Maximize charity this night — it equals 83+ years of worship', 'Donate to Zakat al-Fitr early'],
    is_fasting_day: true,
    is_multi_day: false,
  });

  // Eid al-Fitr — 1 Shawwal
  const eidFitr = hijriToGregorian(hijriYear, 10, 1);
  events.push({
    key: 'eid_fitr',
    name: "Eid al-Fitr",
    arabic: 'عيد الفطر',
    hijri: `1 Shawwal ${hijriYear}H`,
    start: toISO(eidFitr),
    end: addDays(toISO(eidFitr), 2),
    duration_days: 3,
    category: 'holiday',
    color: '#10b981',
    emoji: '🎉',
    description: "The Festival of Breaking the Fast. Pay Zakat al-Fitr before Eid prayer, perform Eid Salah, visit family, and celebrate.",
    devotional_suggestions: [
      'Pay Zakat al-Fitr for all household members',
      'Perform Eid Salah in congregation',
      'Visit family and maintain silat al-rahim',
      'Fast 6 days of Shawwal'
    ],
    sadaqah_suggestions: ['Zakat al-Fitr (obligatory)', 'Extra Sadaqah for Eid joy to the poor'],
    is_fasting_day: false,
    is_multi_day: true,
  });

  // 6 days of Shawwal
  const shawwalFasting = addDays(toISO(eidFitr), 1);
  events.push({
    key: 'shawwal_fasting',
    name: "6 Days of Shawwal",
    arabic: 'صيام ستة من شوال',
    hijri: `2-27 Shawwal ${hijriYear}H`,
    start: shawwalFasting,
    end: addDays(toISO(eidFitr), 27),
    duration_days: 6,
    category: 'holiday',
    color: '#059669',
    emoji: '🌿',
    description: "The Prophet ﷺ said: 'Whoever fasts Ramadan and follows it with 6 days of Shawwal, it will be as if he fasted the entire year.'",
    devotional_suggestions: [
      'Fast any 6 days during Shawwal (not on Eid day)',
      'Make intention each night before',
      'Read Quran during the fast',
      'Continue Tarawih-level prayer quality'
    ],
    sadaqah_suggestions: ['Continue Ramadan-level generosity in Shawwal'],
    is_fasting_day: true,
    is_multi_day: true,
  });

  // Day of Arafah — 9 Dhul Hijjah
  const arafah = hijriToGregorian(hijriYear, 12, 9);
  events.push({
    key: 'arafah',
    name: "Day of Arafah",
    arabic: 'يوم عرفة',
    hijri: `9 Dhul Hijjah ${hijriYear}H`,
    start: toISO(arafah),
    end: toISO(arafah),
    duration_days: 1,
    category: 'holiday',
    color: '#ea580c',
    emoji: '🏔️',
    description: "The greatest day of the year. Fasting expiates sins of the previous and upcoming year. The best dua is on the Day of Arafah.",
    devotional_suggestions: [
      'Fast this day (expiates 2 years of sins)',
      'Make abundant dua from Dhuhr to Maghrib',
      "Recite: 'La ilaha illallah wahdahu la sharika lah, lahul mulk...' 100 times",
      'Perform dhikr and takbeer frequently'
    ],
    sadaqah_suggestions: ['Give Udhiyah/Qurbani this day', 'Donate to global food relief'],
    is_fasting_day: true,
    is_multi_day: false,
  });

  // Eid al-Adha — 10 Dhul Hijjah
  const eidAdha = hijriToGregorian(hijriYear, 12, 10);
  events.push({
    key: 'eid_adha',
    name: "Eid al-Adha",
    arabic: 'عيد الأضحى',
    hijri: `10 Dhul Hijjah ${hijriYear}H`,
    start: toISO(eidAdha),
    end: addDays(toISO(eidAdha), 3),
    duration_days: 4,
    category: 'holiday',
    color: '#dc2626',
    emoji: '🐑',
    description: "The Festival of Sacrifice. Commemorates the sacrifice of Ibrahim (AS). Perform Eid Salah and offer Udhiyah (Qurbani).",
    devotional_suggestions: [
      'Perform Eid al-Adha Salah',
      'Offer Udhiyah (Qurbani)',
      'Distribute meat to family, neighbours, and the poor',
      'Visit family on the days of Tashreeq'
    ],
    sadaqah_suggestions: ['Qurbani/Udhiyah donation', 'Distribute meat to the needy globally'],
    is_fasting_day: false,
    is_multi_day: true,
  });

  return events;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'get_events') {
      const hijriYear = body.hijri_year || null;
      const today = new Date();
      const hy = hijriYear || getHijriYear(today);
      const events = getMajorIslamicDates(hy);
      return Response.json({ events, hijri_year: hy });
    }

    if (action === 'import_to_calendar') {
      const { events_to_import } = body;
      if (!Array.isArray(events_to_import) || !events_to_import.length) {
        return Response.json({ error: 'No events provided' }, { status: 400 });
      }

      const created = [];
      for (const ev of events_to_import) {
        const startDate = new Date(ev.start + 'T00:00:00');
        const endDate = new Date(ev.end + 'T23:59:59');

        const eventData = {
          title: `${ev.emoji} ${ev.name}`,
          description: ev.description + (ev.devotional_goal ? `\n\n🎯 Goal: ${ev.devotional_goal}` : '') + (ev.sadaqah_plan ? `\n\n💰 Sadaqah: ${ev.sadaqah_plan}` : ''),
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_all_day: true,
          category: ev.category || 'holiday',
          color: ev.color,
          notes: `Hijri: ${ev.hijri}` + (ev.devotional_goal ? `\nGoal: ${ev.devotional_goal}` : '') + (ev.sadaqah_plan ? `\nSadaqah: ${ev.sadaqah_plan}` : ''),
        };

        const result = await base44.entities.Event.create(eventData);
        created.push(result);
      }

      return Response.json({ created: created.length, events: created });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('generateHijriEvents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
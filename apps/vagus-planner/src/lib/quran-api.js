/**
 * Al-Quran Cloud API helpers (same source as DailyVerse).
 * Free, no auth. Returns real Uthmani Arabic + English translation.
 *
 * Audio: islamic.network CDN — bitrate availability differs by reciter.
 * Always use the bitrate listed on each RECITERS entry (128 is NOT universal).
 */

const BASE = 'https://api.alquran.cloud/v1';

const TRANSLATIONS = [
  { id: 'en.asad', label: 'Muhammad Asad' },
  { id: 'en.sahih', label: 'Sahih International' },
  { id: 'en.pickthall', label: 'Pickthall' },
  { id: 'en.yusufali', label: 'Yusuf Ali' },
];

/**
 * Reciters verified against cdn.islamic.network (ayah 1 HEAD).
 * bitrate must match what the CDN actually hosts for that folder.
 */
const RECITERS = [
  { id: 'ar.alafasy', label: 'Mishary Alafasy', bitrate: 128 },
  { id: 'ar.minshawi', label: 'Mohamed Al-Minshawi', bitrate: 128 },
  { id: 'ar.husary', label: 'Mahmoud Al-Husary', bitrate: 128 },
  { id: 'ar.shaatree', label: 'Abu Bakr Ash-Shaatree', bitrate: 128 },
  { id: 'ar.mahermuaiqly', label: 'Maher Al-Muaiqly', bitrate: 128 },
  { id: 'ar.hudhaify', label: 'Ali Al-Hudhaify', bitrate: 128 },
  // These two are 403 at 128kbps on the CDN — use 192 (also available at 64)
  { id: 'ar.abdurrahmaansudais', label: 'Abdurrahman As-Sudais', bitrate: 192 },
  { id: 'ar.abdullahbasfar', label: 'Abdullah Basfar', bitrate: 192 },
];

function getReciter(reciterId) {
  return RECITERS.find((r) => r.id === reciterId) || RECITERS[0];
}

/** CDN audio by absolute ayah number (1–6236), using the reciter's valid bitrate. */
function getAyahAudioUrl(reciterId, globalAyahNumber) {
  const reciter = getReciter(reciterId);
  const bitrate = reciter.bitrate || 128;
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${reciter.id}/${globalAyahNumber}.mp3`;
}

/**
 * Probe whether a URL responds (for fallback if CDN changes).
 * Tries primary bitrate, then common alternates.
 */
async function resolveAyahAudioUrl(reciterId, globalAyahNumber) {
  const primary = getAyahAudioUrl(reciterId, globalAyahNumber);
  const candidates = [primary];
  const reciter = getReciter(reciterId);
  for (const br of [128, 192, 64]) {
    if (br === reciter.bitrate) continue;
    candidates.push(`https://cdn.islamic.network/quran/audio/${br}/${reciter.id}/${globalAyahNumber}.mp3`);
  }
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (res.ok) return url;
    } catch {
      // try next
    }
  }
  return primary; // last resort — let <audio> surface the error
}

/**
 * Fetch a full surah: Arabic (Uthmani) + translation editions.
 * @returns {{ surahNumber, name, englishName, revelationType, ayahs: Array }}
 */
async function fetchSurah(surahNumber, translationId = 'en.asad') {
  const n = Number(surahNumber);
  if (!n || n < 1 || n > 114) throw new Error('Invalid surah number');

  const url = `${BASE}/surah/${n}/editions/quran-uthmani,${translationId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quran API error ${res.status}`);

  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data) || json.data.length < 2) {
    throw new Error('Unexpected Quran API response');
  }

  const [arabicEd, transEd] = json.data;
  const arabicAyahs = arabicEd.ayahs || [];
  const transAyahs = transEd.ayahs || [];

  const ayahs = arabicAyahs.map((a, i) => ({
    numberInSurah: a.numberInSurah,
    globalNumber: a.number,
    arabic: (a.text || '').replace(/^\uFEFF/, ''),
    translation: (transAyahs[i]?.text || '').trim(),
  }));

  return {
    surahNumber: n,
    name: arabicEd.name,
    englishName: arabicEd.englishName,
    englishNameTranslation: arabicEd.englishNameTranslation,
    revelationType: arabicEd.revelationType,
    numberOfAyahs: arabicEd.numberOfAyahs || ayahs.length,
    ayahs,
  };
}

export {
  TRANSLATIONS,
  RECITERS,
  getReciter,
  getAyahAudioUrl,
  resolveAyahAudioUrl,
  fetchSurah,
};

/**
 * Al-Quran Cloud API helpers (same source as DailyVerse).
 * Free, no auth. Returns real Uthmani Arabic + English translation.
 */

const BASE = 'https://api.alquran.cloud/v1';

const TRANSLATIONS = [
  { id: 'en.asad', label: 'Muhammad Asad' },
  { id: 'en.sahih', label: 'Sahih International' },
  { id: 'en.pickthall', label: 'Pickthall' },
  { id: 'en.yusufali', label: 'Yusuf Ali' },
];

const RECITERS = [
  { id: 'ar.alafasy', label: 'Mishary Alafasy' },
  { id: 'ar.abdurrahmaansudais', label: 'Abdurrahman As-Sudais' },
  { id: 'ar.abdullahbasfar', label: 'Abdullah Basfar' },
  { id: 'ar.minshawi', label: 'Mohamed Al-Minshawi' },
];

/** CDN audio by absolute ayah number (1–6236). */
function getAyahAudioUrl(reciterId, globalAyahNumber) {
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${globalAyahNumber}.mp3`;
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

export { TRANSLATIONS, RECITERS, getAyahAudioUrl, fetchSurah };

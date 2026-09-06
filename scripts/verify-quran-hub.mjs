/**
 * Verify Quran hub: real Al-Quran Cloud text (not placeholder Bismillah),
 * Islam wires QuranHub, fake ComprehensiveQuranReader not mounted on Islam,
 * Islamic page redirects into the hub.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK:', msg);
  }
}

const hub = read('apps/vagus-planner/src/components/quran/QuranHub.jsx');
const islam = read('apps/vagus-planner/src/pages/Islam.jsx');
const islamic = read('apps/vagus-planner/src/pages/Islamic.jsx');
const api = read('apps/vagus-planner/src/lib/quran-api.js');
const audio = read('apps/vagus-planner/src/components/islamic/QuranAudioPlayer.jsx');

assert(islam.includes("import QuranHub from '@/components/quran/QuranHub'"), 'Islam imports QuranHub');
assert(islam.includes('<QuranHub'), 'Islam mounts QuranHub');
assert(!islam.includes('ComprehensiveQuranReader'), 'Islam no longer mounts fake ComprehensiveQuranReader');
assert(!hub.includes('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'), 'QuranHub has no hardcoded Bismillah placeholder');
assert(hub.includes("fetchSurah"), 'QuranHub uses fetchSurah');
assert(hub.includes('Practice') || hub.includes('practice'), 'QuranHub has Practice tab');
assert(hub.includes('QuranReadingTracker'), 'Progress includes QuranReadingTracker');
assert(hub.includes('QuranMemorizationTracker'), 'Progress includes MemorizationTracker');
assert(hub.includes('QuranVoiceCheck'), 'Practice includes VoiceCheck');
assert(hub.includes('AITafsirPanel'), 'Read Explain uses AITafsirPanel');
assert(api.includes('api.alquran.cloud'), 'quran-api uses Al-Quran Cloud');
assert(api.includes('quran-uthmani'), 'Fetches Uthmani Arabic edition');
assert(audio.includes('globalAyah') || audio.includes('getAyahAudioUrl'), 'Audio uses absolute ayah CDN URLs');
assert(islamic.includes("section=quran") || islamic.includes("createPageUrl('Islam')"), 'Islamic redirects to Islam hub');
assert(islamic.includes('replace: true'), 'Islamic redirect is replace');

// Live API check — Surah 112:1 must NOT be Bismillah-only (Al-Ikhlas starts with Qul huwa)
const BISMILLAH = 'بِسْمِ';
const IKHLAS_MARKER = 'قُلْ هُوَ';

async function liveApi() {
  const url = 'https://api.alquran.cloud/v1/surah/112/editions/quran-uthmani,en.asad';
  const res = await fetch(url);
  assert(res.ok, `Al-Quran Cloud HTTP ${res.status}`);
  const json = await res.json();
  assert(json.code === 200, 'API code 200');
  const ar = (json.data[0].ayahs[0].text || '').replace(/^\uFEFF/, '');
  const en = json.data[1].ayahs[0].text || '';
  assert(ar.includes(IKHLAS_MARKER) || ar.includes('قل هو'), `112:1 Arabic is Al-Ikhlas (got: ${ar.slice(0, 40)})`);
  assert(!ar.startsWith(BISMILLAH) || ar.includes(IKHLAS_MARKER), '112:1 is not fake repeated Bismillah');
  assert(/One|Allah|God/i.test(en), `112:1 English translation present (got: ${en.slice(0, 60)})`);

  // Also confirm Baqarah 2:255 (Ayat al-Kursi) is distinct
  const res2 = await fetch('https://api.alquran.cloud/v1/ayah/2:255/editions/quran-uthmani,en.asad');
  const j2 = await res2.json();
  const ar2 = (j2.data[0].text || '').replace(/^\uFEFF/, '');
  assert(ar2.includes('اللَّهُ') || ar2.includes('ٱللَّهُ'), `2:255 Arabic loaded (len=${ar2.length})`);
  assert(ar2.length > 40, '2:255 is longer than a stub Bismillah line');
}

await liveApi();

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nAll Quran hub verification checks passed.');

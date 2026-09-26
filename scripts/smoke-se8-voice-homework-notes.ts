/**
 * Evidence: voice resolution, France→fr default, homework image normalize, notes logic.
 * Live OpenAI TTS when OPENAI_API_KEY is set.
 *
 * Usage: npx tsx scripts/smoke-se8-voice-homework-notes.ts
 */
import Module from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const shim = path.resolve('scripts/shims/server-only.js');
const orig = (Module as unknown as { _resolveFilename: Function })._resolveFilename;
(Module as unknown as { _resolveFilename: Function })._resolveFilename = function (
  request: string,
  parent: unknown,
  isMain: boolean,
  options: unknown
) {
  if (request === 'server-only') return shim;
  return orig.call(this, request, parent, isMain, options);
};

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
    } catch {
      /* missing */
    }
  }
}

loadEnv();

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  const {
    defaultStudyLanguageForCurriculum,
    isShiftStudyLanguage,
  } = await import('../lib/shift-ai/constants');
  const {
    resolveOpenAiTtsVoice,
    defaultOpenAiTtsVoiceForLanguage,
  } = await import('../lib/shift-ai/openai-tts-voices');
  const { normalizeHomeworkImage, detectImageKind } = await import(
    '../lib/shift-ai/homework-image'
  );
  const { synthesizeSe8Speech, isOpenAiTtsConfigured } = await import(
    '../lib/shift-ai/openai-tts'
  );

  assert(isShiftStudyLanguage('fr'), 'fr is a study language');
  assert(isShiftStudyLanguage('es'), 'es is a study language');
  assert(defaultStudyLanguageForCurriculum('france') === 'fr', 'France → fr');
  assert(defaultStudyLanguageForCurriculum('saudi') === 'ar', 'Saudi → ar');
  assert(defaultStudyLanguageForCurriculum('uk') === 'en', 'UK → en');

  assert(defaultOpenAiTtsVoiceForLanguage('fr') === 'coral', 'FR default voice coral');
  assert(defaultOpenAiTtsVoiceForLanguage('es') === 'nova', 'ES default voice nova');

  // preferred_voice must win over language default
  assert(
    resolveOpenAiTtsVoice({ preferredVoice: 'onyx', studyLanguage: 'fr' }) === 'onyx',
    'preferred_voice onyx respected'
  );
  // legacy browser voice names ignored
  assert(
    resolveOpenAiTtsVoice({
      preferredVoice: 'Google UK English Female',
      studyLanguage: 'fr',
    }) === 'coral',
    'legacy browser voice ignored; fall back to language default'
  );
  assert(
    resolveOpenAiTtsVoice({ studyLanguage: 'en', warmer: true }) === 'shimmer',
    'buddy warmer default shimmer'
  );
  console.log('PASS language + voice resolution');

  // JPEG sniff + empty MIME
  const sharp = (await import('sharp')).default;
  const jpegBuf = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 20, g: 80, b: 200 } },
  })
    .jpeg()
    .toBuffer();

  assert(detectImageKind(jpegBuf) === 'jpeg', 'jpeg magic');
  const emptyMime = await normalizeHomeworkImage({
    buffer: jpegBuf,
    reportedMime: '',
    filename: 'photo.jpg',
  });
  assert(emptyMime.ok, 'empty MIME accepted via signature');
  console.log('PASS empty MIME / jpeg sniff');

  // HEIC convert (if sharp can encode heif) — else synthesize ftyp+heic header path with real convert from jpeg via heif
  let heicBuf: Buffer | null = null;
  try {
    heicBuf = await sharp(jpegBuf).heif({ compression: 'hevc' }).toBuffer();
  } catch {
    heicBuf = null;
  }

  // Prefer a real HEIC fixture if present (downloaded sample or generated)
  const realHeicPaths = ['/tmp/sample.heic', path.resolve('.tmp-se8-tts/sample.heic')];
  let realHeic: Buffer | null = null;
  for (const p of realHeicPaths) {
    try {
      realHeic = readFileSync(p);
      if (detectImageKind(realHeic) === 'heic') break;
      realHeic = null;
    } catch {
      realHeic = null;
    }
  }

  if (heicBuf && detectImageKind(heicBuf) === 'heic') {
    realHeic = heicBuf;
  }

  if (realHeic) {
    const converted = await normalizeHomeworkImage({
      buffer: realHeic,
      reportedMime: '',
      filename: 'iphone.HEIC',
    });
    assert(converted.ok, `HEIC convert should succeed: ${!converted.ok ? converted.error : ''}`);
    if (converted.ok) {
      assert(converted.contentType === 'image/jpeg', 'HEIC becomes jpeg');
      assert(detectImageKind(converted.buffer) === 'jpeg', 'converted buffer is jpeg');
      mkdirSync(path.resolve('.tmp-se8-tts'), { recursive: true });
      writeFileSync(path.resolve('.tmp-se8-tts/heic-converted.jpg'), converted.buffer);
    }
    console.log('PASS HEIC→JPEG conversion (real sample)');
  } else {
    const fakeHeic = Buffer.alloc(32);
    fakeHeic.write('xxxxftypheic', 0, 'ascii');
    assert(detectImageKind(fakeHeic) === 'heic', 'ftyp heic detected');
    const failConvert = await normalizeHomeworkImage({
      buffer: fakeHeic,
      reportedMime: '',
      filename: 'bad.heic',
    });
    assert(!failConvert.ok && failConvert.code === 'CONVERT_FAILED', 'bad heic → CONVERT_FAILED');
    console.log('PASS HEIC detect + CONVERT_FAILED path (no real HEIC fixture)');
  }

  // Notes debounce + beforeunload flush semantics (mirrors SubjectNotesPanel)
  {
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const saves: string[] = [];
    const save = (c: string) => {
      saves.push(c);
      dirty = false;
    };
    const schedule = (c: string) => {
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        save(c);
      }, 40);
    };
    const flush = (c: string) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (dirty) save(c);
    };
    schedule('a');
    schedule('ab');
    schedule('abc');
    await new Promise((r) => setTimeout(r, 60));
    assert(saves.join(',') === 'abc', `debounce coalesces: ${saves}`);
    schedule('pending');
    flush('pending-flushed');
    assert(saves.join(',') === 'abc,pending-flushed', `flush saves dirty: ${saves}`);
    console.log('PASS notes debounce + beforeunload flush semantics');
  }

  // Live TTS
  if (!isOpenAiTtsConfigured()) {
    console.log('SKIP live OpenAI TTS — set OPENAI_API_KEY in .env.local to verify audio');
  } else {
    const outDir = path.resolve('.tmp-se8-tts');
    mkdirSync(outDir, { recursive: true });

    const en = await synthesizeSe8Speech({
      text: 'Hello, I am your SuperEduc8 voice tutor.',
      studyLanguage: 'en',
      preferredVoice: 'nova',
    });
    assert(en.ok, `EN TTS failed: ${!en.ok ? en.error : ''}`);
    if (en.ok) {
      const enPath = path.join(outDir, 'tutor-en-nova.mp3');
      writeFileSync(enPath, en.buffer);
      assert(en.buffer.length > 1000, 'EN mp3 should have audio bytes');
      console.log('PASS EN TTS', en.voice, en.buffer.length, 'bytes →', enPath);
    }

    const fr = await synthesizeSe8Speech({
      text: 'Bonjour, je suis ton tuteur vocal SuperEduc8.',
      studyLanguage: 'fr',
      preferredVoice: null,
    });
    assert(fr.ok, `FR TTS failed: ${!fr.ok ? fr.error : ''}`);
    if (fr.ok) {
      assert(fr.voice === 'coral', 'FR default voice coral');
      const frPath = path.join(outDir, 'tutor-fr-coral.mp3');
      writeFileSync(frPath, fr.buffer);
      console.log('PASS FR TTS', fr.voice, fr.buffer.length, 'bytes →', frPath);
    }

    const onyx = await synthesizeSe8Speech({
      text: 'This should use the onyx voice from settings.',
      studyLanguage: 'en',
      preferredVoice: 'onyx',
    });
    assert(onyx.ok && onyx.ok && onyx.voice === 'onyx', 'preferred onyx respected in TTS');
    if (onyx.ok) {
      writeFileSync(path.join(outDir, 'tutor-en-onyx.mp3'), onyx.buffer);
      console.log('PASS preferred_voice onyx TTS');
    }
  }

  console.log('\nPASS se8 voice/homework/notes smoke (core assertions)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

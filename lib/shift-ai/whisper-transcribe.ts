import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

export const SE8_WHISPER_MODEL = 'whisper-large-v3-turbo';

export const SE8_TRANSCRIPTION_UNAVAILABLE =
  'Voice transcription is temporarily unavailable. Please type your answer instead.';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export type Se8TranscribeResult =
  | { ok: true; transcript: string; provider: 'groq'; model: string }
  | { ok: false; error: string; status: number; code: string };

/** Map SE8 study language → Whisper ISO-639-1 hint (optional). */
export function whisperLanguageForStudyLanguage(
  lang: string | null | undefined
): string | undefined {
  switch (lang) {
    case 'ar':
      return 'ar';
    case 'fr':
      return 'fr';
    case 'es':
      return 'es';
    case 'en':
      return 'en';
    default:
      return undefined;
  }
}

function guessExtension(mime: string): string {
  const type = mime.toLowerCase().split(';')[0]?.trim() || '';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('webm')) return 'webm';
  return 'm4a';
}

/**
 * Transcribe student voice audio via Groq Whisper (same model as Vagus Planner).
 */
export async function transcribeSe8Audio(input: {
  buffer: Buffer;
  contentType?: string | null;
  filename?: string | null;
  language?: string | null;
}): Promise<Se8TranscribeResult> {
  if (!input.buffer.length) {
    return { ok: false, error: 'Audio is empty', status: 400, code: 'EMPTY_AUDIO' };
  }
  if (input.buffer.length > MAX_AUDIO_BYTES) {
    return {
      ok: false,
      error: 'Recording is too long. Keep it under about 30 seconds and try again.',
      status: 400,
      code: 'TOO_LARGE',
    };
  }

  const groq = getGroqClient();
  if (!groq) {
    return {
      ok: false,
      error: SE8_TRANSCRIPTION_UNAVAILABLE,
      status: 503,
      code: 'WHISPER_UNAVAILABLE',
    };
  }

  const contentType =
    (input.contentType || '').split(';')[0]?.trim() || 'audio/mp4';
  const filename =
    input.filename?.trim() ||
    `voice.${guessExtension(contentType)}`;

  const file = new File([new Uint8Array(input.buffer)], filename, {
    type: contentType,
  });

  try {
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: SE8_WHISPER_MODEL,
      language: whisperLanguageForStudyLanguage(input.language) || undefined,
      response_format: 'json',
      temperature: 0,
    });

    const raw = transcription as { text?: unknown } | string;
    const text =
      typeof raw === 'string'
        ? raw.trim()
        : typeof raw.text === 'string'
          ? raw.text.trim()
          : '';

    if (!text) {
      return {
        ok: false,
        error: "I didn't catch that — try speaking a bit louder, or type your answer.",
        status: 422,
        code: 'EMPTY_TRANSCRIPT',
      };
    }

    return {
      ok: true,
      transcript: text,
      provider: 'groq',
      model: SE8_WHISPER_MODEL,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[se8-transcribe] Whisper failed:', message);
    return {
      ok: false,
      error: SE8_TRANSCRIPTION_UNAVAILABLE,
      status: 502,
      code: 'WHISPER_FAILED',
    };
  }
}

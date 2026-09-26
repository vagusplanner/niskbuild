import 'server-only';

import OpenAI from 'openai';
import {
  OPENAI_TTS_MODEL,
  resolveOpenAiTtsVoice,
  type OpenAiTtsVoiceId,
} from '@/lib/shift-ai/openai-tts-voices';

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function isOpenAiTtsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export type SynthesizeSe8SpeechInput = {
  text: string;
  preferredVoice?: string | null;
  studyLanguage?: string | null;
  warmer?: boolean;
  /** Override resolved voice (already validated) */
  voice?: OpenAiTtsVoiceId;
  /** 0.25–4.0; Buddy uses ~0.9 */
  speed?: number;
};

export type SynthesizeSe8SpeechResult =
  | { ok: true; buffer: Buffer; voice: OpenAiTtsVoiceId; contentType: 'audio/mpeg' }
  | { ok: false; error: string; status: number };

/**
 * Generate MP3 audio via OpenAI tts-1-hd.
 */
export async function synthesizeSe8Speech(
  input: SynthesizeSe8SpeechInput
): Promise<SynthesizeSe8SpeechResult> {
  const text = input.text.trim();
  if (!text) {
    return { ok: false, error: 'Text is required', status: 400 };
  }
  if (text.length > 4096) {
    return { ok: false, error: 'Text too long for speech', status: 400 };
  }

  const client = getOpenAiClient();
  if (!client) {
    return {
      ok: false,
      error: 'OpenAI TTS is not configured. Set OPENAI_API_KEY.',
      status: 503,
    };
  }

  const voice =
    input.voice ??
    resolveOpenAiTtsVoice({
      preferredVoice: input.preferredVoice,
      studyLanguage: input.studyLanguage,
      warmer: input.warmer,
    });

  const speed = Math.min(4, Math.max(0.25, input.speed ?? (input.warmer ? 0.9 : 1)));

  try {
    const response = await client.audio.speech.create({
      model: OPENAI_TTS_MODEL,
      voice,
      input: text,
      response_format: 'mp3',
      speed,
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      ok: true,
      buffer: Buffer.from(arrayBuffer),
      voice,
      contentType: 'audio/mpeg',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'TTS failed';
    console.error('[se8-tts] OpenAI speech failed:', message);
    return { ok: false, error: message, status: 502 };
  }
}

import { getGroqClient } from '@/lib/groq-client';
import { withGroqTimeout } from '@/lib/shift-ai/groq-json';
import type { VpFunctionHandler } from '../types';

const WHISPER_MODEL = 'whisper-large-v3-turbo';
const SIGNED_URL_TTL_SEC = 3600;

function readAudioUrl(payload: Record<string, unknown>): string | null {
  const keys = ['audio_url', 'file_url', 'url'] as const;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function readStoragePath(payload: Record<string, unknown>): string | null {
  const keys = ['storage_path', 'path'] as const;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

async function resolveAudioDownloadUrl(
  payload: Record<string, unknown>
): Promise<{ url: string; source: 'signed_url' | 'storage_path' } | null> {
  const directUrl = readAudioUrl(payload);
  if (directUrl) {
    return { url: directUrl, source: 'signed_url' };
  }

  const storagePath = readStoragePath(payload);
  if (!storagePath) return null;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('uploads')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) return null;
  return { url: data.signedUrl, source: 'storage_path' };
}

function guessFilename(url: string, contentType: string | null): string {
  const fromPath = url.split('?')[0].split('/').pop();
  if (fromPath && fromPath.includes('.')) return fromPath;
  if (contentType?.includes('mp4') || contentType?.includes('m4a')) return 'audio.m4a';
  if (contentType?.includes('mpeg') || contentType?.includes('mp3')) return 'audio.mp3';
  if (contentType?.includes('wav')) return 'audio.wav';
  return 'audio.webm';
}

/** Download audio from signed URL (client or server-generated) and transcribe via Groq Whisper. */
export const transcribeAudio: VpFunctionHandler = async ({ payload }) => {
  const resolved = await resolveAudioDownloadUrl(payload);
  if (!resolved) {
    return {
      ok: false,
      error: 'file_url, audio_url, or storage_path is required',
      status: 400,
    };
  }

  const audioUrl = resolved.url;

  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI transcription is temporarily unavailable', status: 503 };
  }

  let audioRes: Response;
  try {
    audioRes = await fetch(audioUrl);
  } catch {
    return { ok: false, error: 'Could not download audio file', status: 400 };
  }

  if (!audioRes.ok) {
    return { ok: false, error: `Could not download audio (${audioRes.status})`, status: 400 };
  }

  const contentType = audioRes.headers.get('content-type');
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  if (buffer.length === 0) {
    return { ok: false, error: 'Audio file is empty', status: 400 };
  }

  const filename = guessFilename(audioUrl, contentType);
  const file = new File([buffer], filename, {
    type: contentType?.split(';')[0]?.trim() || 'audio/webm',
  });

  try {
    const transcription = await withGroqTimeout(
      groq.audio.transcriptions.create({
        file,
        model: WHISPER_MODEL,
        language: typeof payload.language === 'string' ? payload.language : undefined,
        response_format: 'json',
        temperature: 0,
      })
    );

    const text =
      typeof transcription === 'string'
        ? transcription
        : typeof transcription === 'object' && transcription && 'text' in transcription
          ? String((transcription as { text?: string }).text ?? '')
          : '';

    if (!text.trim()) {
      return { ok: false, error: 'Transcription was empty', status: 502 };
    }

    return { ok: true, data: { success: true, transcript: text.trim() } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return { ok: false, error: message, status: 502 };
  }
};

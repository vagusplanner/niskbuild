import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getGroqClient } from '@/lib/groq-client';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export const maxDuration = 60;

const WHISPER_MODEL = 'whisper-large-v3-turbo';
const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function guessExtension(mime: string): string {
  const type = mime.toLowerCase().split(';')[0]?.trim() || '';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('webm')) return 'webm';
  return 'm4a';
}

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/**
 * POST /api/north-south/transcribe
 * JSON: { audio_url } — downloads signed Storage URL and runs Groq Whisper.
 * Also accepts multipart form: audio=<blob> for direct uploads.
 * Returns { text } (Base44-compatible).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withNsApiCors(request, guard.response);

  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let mime = 'audio/webm';
    let filename = 'audio.webm';

    if (contentType.includes('multipart/form-data')) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return nsApiJson(request, { error: 'Invalid form body' }, { status: 400 });
      }
      const file = form.get('audio') || form.get('file');
      if (!(file instanceof File) || file.size === 0) {
        return nsApiJson(request, { error: 'audio file is required' }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      mime = file.type || 'audio/webm';
      filename = file.name || `audio.${guessExtension(mime)}`;
    } else {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return nsApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
      }
      const audioUrl = typeof body.audio_url === 'string' ? body.audio_url.trim() : '';
      if (!audioUrl) {
        return nsApiJson(request, { error: 'audio_url is required' }, { status: 400 });
      }

      let downloaded: Response;
      try {
        downloaded = await fetch(audioUrl);
      } catch {
        return nsApiJson(request, { error: 'Could not download audio_url' }, { status: 400 });
      }
      if (!downloaded.ok) {
        return nsApiJson(
          request,
          { error: `Could not download audio_url (${downloaded.status})` },
          { status: 400 }
        );
      }
      const arr = await downloaded.arrayBuffer();
      buffer = Buffer.from(arr);
      mime = downloaded.headers.get('content-type') || 'audio/webm';
      filename = `audio.${guessExtension(mime)}`;
    }

    if (!buffer.length) {
      return nsApiJson(request, { error: 'Audio is empty' }, { status: 400 });
    }
    if (buffer.length > MAX_AUDIO_BYTES) {
      return nsApiJson(
        request,
        { error: 'Recording is too large. Please use a shorter clip.' },
        { status: 400 }
      );
    }

    const groq = getGroqClient();
    if (!groq) {
      return nsApiJson(
        request,
        { error: 'Transcription is temporarily unavailable' },
        { status: 503 }
      );
    }

    const file = new File([new Uint8Array(buffer)], filename, {
      type: mime.split(';')[0]?.trim() || 'audio/webm',
    });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
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
      return nsApiJson(
        request,
        { error: 'Could not transcribe audio — try a clearer recording.' },
        { status: 422 }
      );
    }

    return nsApiJson(request, {
      text,
      transcript: text,
      provider: 'groq',
      model: WHISPER_MODEL,
    });
  } catch (error) {
    captureApiException(error);
    const message =
      error instanceof Error ? error.message : 'Transcription failed';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}

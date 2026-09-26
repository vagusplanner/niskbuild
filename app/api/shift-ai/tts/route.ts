import { NextRequest } from 'next/server';
import { resolveRequestUser, getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { studyLanguageFromStudent } from '@/lib/shift-ai/study-language';
import { synthesizeSe8Speech } from '@/lib/shift-ai/openai-tts';
import { isOpenAiTtsVoiceId } from '@/lib/shift-ai/openai-tts-voices';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

/**
 * POST /api/shift-ai/tts
 * Body: { text, voice?, warmer? }
 * Returns audio/mpeg (OpenAI tts-1-hd).
 */
export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const text = typeof payload.text === 'string' ? payload.text : '';
  const warmer = payload.warmer === true;
  const voiceOverride =
    typeof payload.voice === 'string' && isOpenAiTtsVoiceId(payload.voice)
      ? payload.voice
      : undefined;

  const auth = await getShiftStudentForRequest(request);
  let preferredVoice: string | null = null;
  let studyLanguage = 'en';

  if (auth.ok) {
    const admin = createAdminClient();
    const { data: student } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('preferred_voice, study_language, curriculum, voice_enabled')
      .eq('id', auth.student.id)
      .maybeSingle();

    if (student?.voice_enabled === false) {
      return shiftAiApiJson(
        request,
        { error: 'Voice is disabled in Settings', code: 'VOICE_DISABLED' },
        { status: 403 }
      );
    }

    preferredVoice =
      typeof student?.preferred_voice === 'string' ? student.preferred_voice : null;
    studyLanguage = studyLanguageFromStudent(student ?? {});
  }

  const result = await synthesizeSe8Speech({
    text,
    preferredVoice,
    studyLanguage,
    warmer,
    voice: voiceOverride,
  });

  if (!result.ok) {
    return shiftAiApiJson(request, { error: result.error }, { status: result.status });
  }

  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': result.contentType,
    'Cache-Control': 'no-store',
    'X-Se8-Tts-Voice': result.voice,
  };
  // CORS for Capacitor / SPA if needed
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers.Vary = 'Origin';
  }

  return new Response(new Uint8Array(result.buffer), { status: 200, headers });
}

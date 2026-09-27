import { NextRequest } from 'next/server';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';
import { requireShiftPremiumAccess } from '@/lib/shift-ai/plan-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { transcribeSe8Audio } from '@/lib/shift-ai/whisper-transcribe';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

/**
 * POST /api/shift-ai/transcribe
 * multipart form: audio=<blob>, optional language override
 * Returns { transcript } from Groq whisper-large-v3-turbo.
 */
export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return shiftAiApiJson(request, { error: auth.error }, { status: auth.status });
  }

  const premiumBlock = await requireShiftPremiumAccess(request, auth.userId);
  if (premiumBlock) {
    try {
      const clone = premiumBlock.clone();
      const data = (await clone.json()) as Record<string, unknown>;
      return shiftAiApiJson(
        request,
        { ...data, code: data.code || 'SHIFT_PREMIUM_REQUIRED' },
        { status: 402 }
      );
    } catch {
      return premiumBlock;
    }
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('voice_enabled, study_language, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  if (student?.voice_enabled === false) {
    return shiftAiApiJson(
      request,
      { error: 'Voice is disabled in Settings', code: 'VOICE_DISABLED' },
      { status: 403 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid form body', code: 'BAD_FORM' }, { status: 400 });
  }

  const file = form.get('audio');
  if (!(file instanceof File) || file.size === 0) {
    return shiftAiApiJson(
      request,
      { error: 'Audio recording is required', code: 'MISSING_AUDIO' },
      { status: 400 }
    );
  }

  const languageOverride =
    typeof form.get('language') === 'string' ? String(form.get('language')).trim() : '';
  const language =
    languageOverride || (await getStudentLanguage(auth.student.id));

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await transcribeSe8Audio({
    buffer,
    contentType: file.type || 'audio/mp4',
    filename: file.name || 'voice.m4a',
    language,
  });

  if (!result.ok) {
    return shiftAiApiJson(
      request,
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  return shiftAiApiJson(request, {
    transcript: result.transcript,
    provider: result.provider,
    model: result.model,
  });
}

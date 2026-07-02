import { NextRequest, NextResponse } from 'next/server';
import { isShiftCurriculum } from '@/lib/shift-ai/constants';
import { updateSettingsProfile } from '@/lib/shift-ai/settings';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function PATCH(request: NextRequest) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  const curriculum =
    typeof payload.curriculum === 'string' && isShiftCurriculum(payload.curriculum)
      ? payload.curriculum
      : undefined;
  const yearGroup = typeof payload.yearGroup === 'string' ? payload.yearGroup : undefined;
  const favouriteSubjects = Array.isArray(payload.favouriteSubjects)
    ? payload.favouriteSubjects.filter((v): v is string => typeof v === 'string')
    : undefined;
  const voiceEnabled = typeof payload.voiceEnabled === 'boolean' ? payload.voiceEnabled : undefined;
  const preferredVoice =
    typeof payload.preferredVoice === 'string' || payload.preferredVoice === null
      ? (payload.preferredVoice as string | null)
      : undefined;

  const subjectPersonas = Array.isArray(payload.subjectPersonas)
    ? payload.subjectPersonas
        .filter((row): row is { name: string; aiPersona: string | null } => {
          if (!row || typeof row !== 'object') return false;
          const r = row as Record<string, unknown>;
          return typeof r.name === 'string';
        })
        .map((row) => ({
          name: row.name,
          aiPersona:
            typeof row.aiPersona === 'string' || row.aiPersona === null ? row.aiPersona : null,
        }))
    : undefined;

  try {
    await updateSettingsProfile(auth.student.id, {
      curriculum,
      yearGroup,
      favouriteSubjects,
      voiceEnabled,
      preferredVoice,
      subjectPersonas,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

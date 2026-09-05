import { NextRequest, NextResponse } from 'next/server';
import type { ShiftChatHistoryMessage, ShiftStudentTutorContext } from '@/lib/shift-ai/assistant';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { generateVoiceTutorReply } from '@/lib/shift-ai/voice-tutor';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Privacy: this route accepts transcribed TEXT only.
 * Audio is captured and transcribed in the browser via the Web Speech API —
 * no audio blobs or recordings are ever sent to the server.
 */
export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
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
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const subject =
    typeof payload.subject === 'string' && payload.subject.trim().length > 0
      ? payload.subject.trim()
      : null;

  if (!content) {
    return NextResponse.json({ error: 'Transcribed message text is required' }, { status: 400 });
  }

  const history: ShiftChatHistoryMessage[] = Array.isArray(payload.history)
    ? payload.history
        .filter(
          (entry): entry is ShiftChatHistoryMessage =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            (entry as ShiftChatHistoryMessage).role !== undefined &&
            typeof (entry as ShiftChatHistoryMessage).content === 'string' &&
            ((entry as ShiftChatHistoryMessage).role === 'user' ||
              (entry as ShiftChatHistoryMessage).role === 'assistant')
        )
        .map((entry) => ({
          role: entry.role,
          content: entry.content.trim(),
        }))
        .filter((entry) => entry.content.length > 0)
    : [];

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, key_stage, age_range, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  let aiPersona: string | null = null;
  if (subject) {
    const { data: subjectRow } = await admin
      .schema('firstparty')
      .from('shift_subjects')
      .select('ai_persona')
      .eq('student_id', auth.student.id)
      .ilike('name', subject)
      .maybeSingle();

    aiPersona = subjectRow?.ai_persona ?? null;
  }

  const tutorContext: ShiftStudentTutorContext = {
    year_group: profile.year_group,
    key_stage: profile.key_stage,
    age_range: String(profile.age_range),
    curriculum: String(profile.curriculum),
    curriculumLabel: curriculumLabel(String(profile.curriculum)),
  };

  const result = await generateVoiceTutorReply(content, history, tutorContext, subject, aiPersona);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    reply: result.content,
    userMessage: content,
  });
}

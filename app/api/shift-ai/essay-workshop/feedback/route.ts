import { NextRequest, NextResponse } from 'next/server';
import { upsertEssayDraft } from '@/lib/shift-ai/essays';
import type { WorkshopOutline } from '@/lib/shift-ai/essay-workshop-shared';
import { generateWorkshopFeedback } from '@/lib/shift-ai/essay-workshop';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const examBoard = typeof payload.examBoard === 'string' ? payload.examBoard.trim() : '';
  const level = typeof payload.level === 'string' ? payload.level.trim() : '';
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  const draft = typeof payload.draft === 'string' ? payload.draft : '';
  const wordTarget =
    typeof payload.wordTarget === 'number' ? payload.wordTarget : Number(payload.wordTarget) || 800;
  const essayId = typeof payload.essayId === 'string' ? payload.essayId.trim() : '';
  const outline = (payload.outline as WorkshopOutline | null) ?? null;

  if (!subject || !examBoard || !level || !prompt || !draft.trim()) {
    return NextResponse.json(
      { error: 'subject, examBoard, level, prompt, and draft are required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateWorkshopFeedback({
    subject,
    examBoard,
    level,
    prompt,
    wordTarget,
    draft,
    outline,
    curriculum: String(profile?.curriculum || 'uk'),
    language: await getStudentLanguage(auth.student.id),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  const essay = await upsertEssayDraft({
    essayId: essayId || null,
    studentId: auth.student.id,
    subject,
    title: prompt,
    content: draft,
    submissionType: 'typed',
    aiFeedback: result.feedback,
  });

  return NextResponse.json({ feedback: result.feedback, essayId: essay.id });
}

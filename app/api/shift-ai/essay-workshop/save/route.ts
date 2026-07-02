import { NextRequest, NextResponse } from 'next/server';
import { upsertEssayDraft } from '@/lib/shift-ai/essays';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function POST(request: NextRequest) {
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
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content : '';
  const essayId = typeof payload.essayId === 'string' ? payload.essayId.trim() : '';
  const aiFeedback = payload.aiFeedback ?? null;

  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 });
  }

  try {
    const essay = await upsertEssayDraft({
      essayId: essayId || null,
      studentId: auth.student.id,
      subject,
      title: title || null,
      content,
      submissionType: 'typed',
      aiFeedback,
    });

    return NextResponse.json({ essayId: essay.id, updatedAt: essay.updated_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { generateSpecPoints } from '@/lib/shift-ai/spec-tracker';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const examBoard = typeof payload.examBoard === 'string' ? payload.examBoard.trim() : '';
  if (!subject || !examBoard) {
    return NextResponse.json({ error: 'subject and examBoard are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateSpecPoints({
    studentId: auth.student.id,
    subject,
    examBoard,
    yearGroup: profile?.year_group?.trim() || 'secondary school',
    curriculum: String(profile?.curriculum || 'uk'),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ points: result.points });
}

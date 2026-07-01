import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/shift-ai/subjects';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function PUT(request: NextRequest) {
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
  const subjectId = typeof payload.subjectId === 'string' ? payload.subjectId.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content : '';

  if (!subjectId || !isUuid(subjectId)) {
    return NextResponse.json({ error: 'Valid subjectId is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: subjectRow, error: subjectError } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .select('id, student_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (subjectError || !subjectRow || subjectRow.student_id !== auth.student.id) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_notes')
    .upsert(
      {
        student_id: auth.student.id,
        subject_id: subjectId,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,subject_id' }
    )
    .select('id, content, updated_at')
    .single();

  if (error || !data) {
    console.error('Shift AI notes save failed:', error?.message);
    return NextResponse.json({ error: 'Could not save notes' }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}

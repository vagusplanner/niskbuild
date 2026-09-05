import { NextRequest, NextResponse } from 'next/server';
import { extendHomeworkRetention } from '@/lib/shift-ai/homework-storage';
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
  const uploadId = typeof payload.uploadId === 'string' ? payload.uploadId.trim() : '';
  const additionalDays =
    typeof payload.additionalDays === 'number' ? payload.additionalDays : 7;

  if (!uploadId) {
    return NextResponse.json({ error: 'uploadId is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: owned } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .select('id')
    .eq('id', uploadId)
    .eq('student_id', auth.student.id)
    .maybeSingle();

  if (!owned) {
    return NextResponse.json({ error: 'Homework upload not found' }, { status: 404 });
  }

  try {
    const row = await extendHomeworkRetention(uploadId, additionalDays);

    return NextResponse.json({
      uploadId: row.id,
      expiresAt: row.extended_until ?? row.expires_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not extend retention';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

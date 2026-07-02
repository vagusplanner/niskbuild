import { NextRequest, NextResponse } from 'next/server';
import { cycleSpecStatus, isSpecStatus } from '@/lib/shift-ai/spec-tracker-shared';
import { verifySpecPointOwnership } from '@/lib/shift-ai/spec-tracker';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ pointId: string }> }
) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { pointId } = await context.params;
  const existing = await verifySpecPointOwnership(pointId, auth.student.id);
  if (!existing) {
    return NextResponse.json({ error: 'Spec point not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const nextStatus =
    typeof payload.status === 'string' && isSpecStatus(payload.status)
      ? payload.status
      : cycleSpecStatus(
          isSpecStatus(existing.status) ? existing.status : 'not_covered'
        );

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_spec_points')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pointId)
    .eq('student_id', auth.student.id)
    .select('id, student_id, subject, spec_code, description, status, updated_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Could not update spec point' }, { status: 500 });
  }

  return NextResponse.json({ point: data });
}

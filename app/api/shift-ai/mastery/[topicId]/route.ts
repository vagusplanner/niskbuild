import { NextRequest, NextResponse } from 'next/server';
import { verifyMasteryTopicOwnership } from '@/lib/shift-ai/mastery';
import { isMasteryStatus } from '@/lib/shift-ai/mastery-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ topicId: string }> }
) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { topicId } = await context.params;
  const existing = await verifyMasteryTopicOwnership(topicId, auth.student.id);
  if (!existing) {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const status = typeof payload.status === 'string' ? payload.status.trim() : '';

  if (!isMasteryStatus(status)) {
    return NextResponse.json({ error: 'Invalid mastery status' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_mastery_topics')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', topicId)
    .select('id, student_id, subject, topic, status, updated_at, created_at')
    .single();

  if (error || !data) {
    console.error('Shift AI mastery topic update failed:', error?.message);
    return NextResponse.json({ error: 'Could not update topic status' }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { createStudyGroup } from '@/lib/shift-ai/groups';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

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
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const subject =
    typeof payload.subject === 'string' && payload.subject.trim()
      ? payload.subject.trim()
      : null;

  if (!name) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
  }

  try {
    const group = await createStudyGroup({
      studentId: auth.student.id,
      name,
      subject,
    });
    return NextResponse.json({ group });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

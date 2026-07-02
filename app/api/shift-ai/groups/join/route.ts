import { NextRequest, NextResponse } from 'next/server';
import { joinStudyGroupByCode } from '@/lib/shift-ai/groups';
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
  const inviteCode = typeof payload.inviteCode === 'string' ? payload.inviteCode.trim() : '';

  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
  }

  try {
    const group = await joinStudyGroupByCode(auth.student.id, inviteCode);
    return NextResponse.json({ group });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not join group';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from 'next/server';
import { createMentorInviteToken } from '@/lib/shift-ai/settings';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function POST() {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const token = await createMentorInviteToken(auth.student.id);
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create mentor link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

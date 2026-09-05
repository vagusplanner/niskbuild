import { NextRequest, NextResponse } from 'next/server';
import { addGroupNote, isGroupMember } from '@/lib/shift-ai/groups';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { groupId } = await context.params;
  const member = await isGroupMember(groupId, auth.student.id);
  if (!member) {
    return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';

  if (!content) {
    return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
  }

  try {
    const note = await addGroupNote({
      groupId,
      studentId: auth.student.id,
      content,
    });
    return NextResponse.json({ note });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not post note';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

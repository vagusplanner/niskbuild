import { NextRequest, NextResponse } from 'next/server';
import { generateGroupFlashcardSet, isGroupMember } from '@/lib/shift-ai/groups';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ groupId: string }> }
) {
  const auth = await getShiftStudentForRequest();
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
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: group } = await admin
    .schema('firstparty')
    .from('shift_study_groups')
    .select('subject')
    .eq('id', groupId)
    .maybeSingle();

  try {
    const set = await generateGroupFlashcardSet({
      groupId,
      studentId: auth.student.id,
      topic,
      subject: group?.subject,
    });
    return NextResponse.json({ set });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not generate flashcards';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

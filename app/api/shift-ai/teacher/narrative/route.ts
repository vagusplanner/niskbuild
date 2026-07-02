import { NextRequest, NextResponse } from 'next/server';
import { generateTeacherNarrative, getTeacherForUser, verifyTeacherStudentAccess } from '@/lib/shift-ai/teacher';
import { getSafeSession } from '@/lib/supabaseSession.server';

export async function POST(request: NextRequest) {
  const session = await getSafeSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const teacher = await getTeacherForUser(session.user.id);
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
  }

  const allowed = await verifyTeacherStudentAccess(teacher.school_id, studentId);
  if (!allowed) {
    return NextResponse.json({ error: 'Student not found in your school' }, { status: 404 });
  }

  try {
    const narrative = await generateTeacherNarrative(teacher.school_id, studentId);
    return NextResponse.json({ narrative });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not generate narrative';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

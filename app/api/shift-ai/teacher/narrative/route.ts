import { NextRequest } from 'next/server';
import {
  generateTeacherNarrative,
  getTeacherForUser,
  verifyTeacherStudentAccess,
} from '@/lib/shift-ai/teacher';
import { resolveRequestUser } from '@/lib/shift-ai/student-auth';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const teacher = await getTeacherForUser(user.id);
  if (!teacher) {
    return shiftAiApiJson(request, { error: 'Teacher access required' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';

  if (!studentId) {
    return shiftAiApiJson(request, { error: 'studentId is required' }, { status: 400 });
  }

  const allowed = await verifyTeacherStudentAccess(teacher.school_id, studentId);
  if (!allowed) {
    return shiftAiApiJson(
      request,
      { error: 'Student not found in your school' },
      { status: 404 }
    );
  }

  try {
    const narrative = await generateTeacherNarrative(teacher.school_id, studentId);
    return shiftAiApiJson(request, { narrative });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not generate narrative';
    return shiftAiApiJson(request, { error: message }, { status: 503 });
  }
}

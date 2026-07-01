import { NextRequest, NextResponse } from 'next/server';
import { generateArcadeQuestions } from '@/lib/shift-ai/arcade';
import { createAdminClient } from '@/lib/supabase/admin';
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
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  const result = await generateArcadeQuestions(
    subject,
    profile.year_group,
    String(profile.curriculum)
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ questions: result.questions });
}

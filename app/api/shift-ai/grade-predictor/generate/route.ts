import { NextRequest, NextResponse } from 'next/server';
import { generateGradePrediction } from '@/lib/shift-ai/grade-predictor';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateGradePrediction({
    studentId: auth.student.id,
    subject,
    yearGroup: profile?.year_group?.trim() || 'secondary school',
    curriculum: String(profile?.curriculum || 'uk'),
    language: await getStudentLanguage(auth.student.id),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ prediction: result.prediction });
}

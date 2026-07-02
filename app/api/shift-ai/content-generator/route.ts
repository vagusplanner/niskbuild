import { NextRequest, NextResponse } from 'next/server';
import type { ContentGeneratorType } from '@/lib/shift-ai/content-generator-shared';
import { generateStudyContent } from '@/lib/shift-ai/content-generator';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_TYPES = new Set<ContentGeneratorType>([
  'summary',
  'practice_questions',
  'revision_notes',
]);

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
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const contentType = payload.contentType as ContentGeneratorType;
  const examBoard =
    typeof payload.examBoard === 'string' && payload.examBoard.trim()
      ? payload.examBoard.trim()
      : undefined;

  if (!subject || !topic || !VALID_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: 'subject, topic, and valid contentType are required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateStudyContent({
    contentType,
    subject,
    topic,
    yearGroup: profile?.year_group?.trim() || 'secondary school',
    curriculum: String(profile?.curriculum || 'uk'),
    examBoard,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ content: result.content });
}

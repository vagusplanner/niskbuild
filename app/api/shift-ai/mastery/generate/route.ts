import { NextRequest, NextResponse } from 'next/server';
import { generateMasteryTopics } from '@/lib/shift-ai/mastery';
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
  const replaceExisting = payload.replaceExisting === true;

  if (!subject) {
    return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { count: existingCount } = await admin
    .schema('firstparty')
    .from('shift_mastery_topics')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', auth.student.id)
    .eq('subject', subject);

  if ((existingCount ?? 0) > 0 && !replaceExisting) {
    return NextResponse.json(
      { error: 'Topic map already exists for this subject. Regenerate to replace it.' },
      { status: 409 }
    );
  }

  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateMasteryTopics(
    subject,
    profile?.year_group || 'secondary school',
    String(profile?.curriculum || 'UK')
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  if (replaceExisting && (existingCount ?? 0) > 0) {
    const { error: deleteError } = await admin
      .schema('firstparty')
      .from('shift_mastery_topics')
      .delete()
      .eq('student_id', auth.student.id)
      .eq('subject', subject);

    if (deleteError) {
      console.error('Shift AI mastery topic replace delete failed:', deleteError.message);
      return NextResponse.json({ error: 'Could not replace topic map' }, { status: 500 });
    }
  }

  const rows = result.topics.map((topic) => ({
    student_id: auth.student.id,
    subject,
    topic,
    status: 'not_started' as const,
  }));

  const { data: topics, error: insertError } = await admin
    .schema('firstparty')
    .from('shift_mastery_topics')
    .insert(rows)
    .select('id, student_id, subject, topic, status, updated_at, created_at');

  if (insertError || !topics) {
    console.error('Shift AI mastery topic insert failed:', insertError?.message);
    return NextResponse.json({ error: 'Could not save mastery topics' }, { status: 500 });
  }

  return NextResponse.json({ topics });
}

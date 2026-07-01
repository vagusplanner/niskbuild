import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateShiftAiTutorReply,
  type ShiftChatHistoryMessage,
  type ShiftStudentTutorContext,
} from '@/lib/shift-ai/assistant';
import { curriculumLabel } from '@/lib/shift-ai/subjects';
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
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const subject =
    typeof payload.subject === 'string' && payload.subject.trim().length > 0
      ? payload.subject.trim()
      : null;

  if (!content) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, key_stage, age_range, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  let aiPersona: string | null = null;
  if (subject) {
    const { data: subjectRow } = await admin
      .schema('firstparty')
      .from('shift_subjects')
      .select('ai_persona')
      .eq('student_id', auth.student.id)
      .ilike('name', subject)
      .maybeSingle();

    aiPersona = subjectRow?.ai_persona ?? null;
  }

  const tutorContext: ShiftStudentTutorContext = {
    year_group: profile.year_group,
    key_stage: profile.key_stage,
    age_range: String(profile.age_range),
    curriculum: String(profile.curriculum),
    curriculumLabel: curriculumLabel(String(profile.curriculum)),
  };

  let historyQuery = admin
    .schema('firstparty')
    .from('shift_chat_history')
    .select('role, content')
    .eq('student_id', auth.student.id)
    .order('created_at', { ascending: false })
    .limit(19);

  if (subject) {
    historyQuery = historyQuery.eq('subject', subject);
  }

  const { data: priorRows, error: historyError } = await historyQuery;

  if (historyError) {
    console.error('Shift AI chat history fetch failed:', historyError.message);
    return NextResponse.json({ error: 'Could not load chat history' }, { status: 500 });
  }

  const history: ShiftChatHistoryMessage[] = (priorRows || [])
    .reverse()
    .filter(
      (row): row is ShiftChatHistoryMessage =>
        (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string'
    );

  const { data: userRow, error: userInsertError } = await admin
    .schema('firstparty')
    .from('shift_chat_history')
    .insert({
      student_id: auth.student.id,
      subject,
      role: 'user',
      content,
    })
    .select('id, role, content, subject, created_at')
    .single();

  if (userInsertError || !userRow) {
    console.error('Shift AI user message save failed:', userInsertError?.message);
    return NextResponse.json({ error: 'Could not save your message' }, { status: 500 });
  }

  const aiResult = await generateShiftAiTutorReply(
    content,
    history,
    tutorContext,
    subject,
    aiPersona
  );
  if (!aiResult.ok) {
    return NextResponse.json({ error: aiResult.error }, { status: 503 });
  }

  const { data: assistantRow, error: assistantInsertError } = await admin
    .schema('firstparty')
    .from('shift_chat_history')
    .insert({
      student_id: auth.student.id,
      subject,
      role: 'assistant',
      content: aiResult.content,
    })
    .select('id, role, content, subject, created_at')
    .single();

  if (assistantInsertError || !assistantRow) {
    console.error('Shift AI assistant message save failed:', assistantInsertError?.message);
    return NextResponse.json({ error: 'Could not save tutor response' }, { status: 500 });
  }

  return NextResponse.json({
    userMessage: userRow,
    assistantMessage: assistantRow,
  });
}

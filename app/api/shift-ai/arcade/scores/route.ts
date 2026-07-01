import { NextRequest, NextResponse } from 'next/server';
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
  const subject =
    typeof payload.subject === 'string' && payload.subject.trim().length > 0
      ? payload.subject.trim()
      : null;
  const score = typeof payload.score === 'number' ? Math.round(payload.score) : NaN;
  const questionsTotal =
    typeof payload.questionsTotal === 'number' ? Math.round(payload.questionsTotal) : NaN;
  const questionsCorrect =
    typeof payload.questionsCorrect === 'number' ? Math.round(payload.questionsCorrect) : NaN;
  const streakBonus =
    typeof payload.streakBonus === 'number' ? Math.round(payload.streakBonus) : NaN;

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    !Number.isFinite(questionsTotal) ||
    questionsTotal < 0 ||
    !Number.isFinite(questionsCorrect) ||
    questionsCorrect < 0 ||
    !Number.isFinite(streakBonus) ||
    streakBonus < 0 ||
    questionsCorrect > questionsTotal
  ) {
    return NextResponse.json({ error: 'Invalid score payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_arcade_scores')
    .insert({
      student_id: auth.student.id,
      subject,
      score,
      questions_total: questionsTotal,
      questions_correct: questionsCorrect,
      streak_bonus: streakBonus,
    })
    .select('id, subject, score, questions_total, questions_correct, streak_bonus, played_at')
    .single();

  if (error || !data) {
    console.error('Shift AI arcade score save failed:', error?.message);
    return NextResponse.json({ error: 'Could not save score' }, { status: 500 });
  }

  return NextResponse.json({ score: data });
}

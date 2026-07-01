import { NextRequest, NextResponse } from 'next/server';
import { verifyCardOwnership } from '@/lib/shift-ai/flashcards';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { SM2_QUALITY, sm2Update, type Sm2RatingKey } from '@/lib/shift-ai/spaced-repetition';

const RATING_KEYS: Sm2RatingKey[] = ['again', 'hard', 'good', 'easy'];

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { cardId } = await context.params;
  const card = await verifyCardOwnership(cardId, auth.student.id);
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  let quality: number | null = null;

  if (typeof payload.quality === 'number' && Number.isFinite(payload.quality)) {
    quality = payload.quality;
  } else if (typeof payload.rating === 'string' && RATING_KEYS.includes(payload.rating as Sm2RatingKey)) {
    quality = SM2_QUALITY[payload.rating as Sm2RatingKey];
  }

  if (quality === null) {
    return NextResponse.json({ error: 'Valid rating or quality is required' }, { status: 400 });
  }

  const updates = sm2Update(
    {
      ease_factor: Number(card.ease_factor),
      interval_days: card.interval_days,
      repetitions: card.repetitions,
    },
    quality
  );

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_flashcards')
    .update(updates)
    .eq('id', cardId)
    .select(
      'id, deck_id, front, back, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, created_at'
    )
    .single();

  if (error || !data) {
    console.error('Shift AI flashcard review update failed:', error?.message);
    return NextResponse.json({ error: 'Could not update card' }, { status: 500 });
  }

  return NextResponse.json({ card: data });
}

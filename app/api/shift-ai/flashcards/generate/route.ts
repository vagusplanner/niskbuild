import { NextRequest, NextResponse } from 'next/server';
import { generateFlashcardDeck } from '@/lib/shift-ai/flashcards';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { isUuid } from '@/lib/shift-ai/subjects';

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
  const mode: 'topic' | 'notes' = payload.mode === 'notes' ? 'notes' : 'topic';
  const subject =
    typeof payload.subject === 'string' && payload.subject.trim()
      ? payload.subject.trim()
      : 'General';
  const cardCount =
    typeof payload.cardCount === 'number' ? Math.round(payload.cardCount) : 12;
  const noteSubjectId =
    typeof payload.noteSubjectId === 'string' ? payload.noteSubjectId.trim() : '';

  let content =
    typeof payload.content === 'string' ? payload.content.trim() : '';
  let generateMode: 'topic' | 'notes' = mode;

  const admin = createAdminClient();

  if (noteSubjectId && isUuid(noteSubjectId)) {
    const { data: noteRow } = await admin
      .schema('firstparty')
      .from('shift_notes')
      .select('content')
      .eq('subject_id', noteSubjectId)
      .eq('student_id', auth.student.id)
      .maybeSingle();

    if (noteRow?.content?.trim()) {
      content = noteRow.content.trim();
      generateMode = 'notes';
    }
  }

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const result = await generateFlashcardDeck({
    mode: generateMode,
    subject,
    content,
    cardCount,
    yearGroup: profile?.year_group || 'secondary school',
    curriculum: String(profile?.curriculum || 'UK'),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  const { data: deck, error: deckError } = await admin
    .schema('firstparty')
    .from('shift_flashcard_decks')
    .insert({
      student_id: auth.student.id,
      subject,
      name: result.deckTitle,
    })
    .select('id, student_id, subject, name, created_at')
    .single();

  if (deckError || !deck) {
    console.error('Shift AI flashcard deck insert failed:', deckError?.message);
    return NextResponse.json({ error: 'Could not save deck' }, { status: 500 });
  }

  const cardRows = result.cards.map((card) => ({
    deck_id: deck.id,
    front: card.front,
    back: card.back,
  }));

  const { data: cards, error: cardsError } = await admin
    .schema('firstparty')
    .from('shift_flashcards')
    .insert(cardRows)
    .select(
      'id, deck_id, front, back, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, created_at'
    );

  if (cardsError || !cards) {
    console.error('Shift AI flashcard insert failed:', cardsError?.message);
    await admin.schema('firstparty').from('shift_flashcard_decks').delete().eq('id', deck.id);
    return NextResponse.json({ error: 'Could not save flashcards' }, { status: 500 });
  }

  return NextResponse.json({
    deck: { ...deck, card_count: cards.length, cards },
  });
}

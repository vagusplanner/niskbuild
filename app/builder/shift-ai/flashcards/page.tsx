import { redirect } from 'next/navigation';
import ShiftAiFlashcardsClient from '@/app/builder/shift-ai/flashcards/ShiftAiFlashcardsClient';
import type {
  Flashcard,
  FlashcardDeckWithCards,
  SavedNotesOption,
} from '@/lib/shift-ai/flashcards-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiFlashcardsPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group, curriculum')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const { data: deckRows } = await admin
    .schema('firstparty')
    .from('shift_flashcard_decks')
    .select('id, student_id, subject, name, created_at')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const deckIds = (deckRows ?? []).map((row) => row.id);
  let cardRows: Flashcard[] = [];

  if (deckIds.length > 0) {
    const { data } = await admin
      .schema('firstparty')
      .from('shift_flashcards')
      .select(
        'id, deck_id, front, back, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, created_at'
      )
      .in('deck_id', deckIds)
      .order('created_at', { ascending: true });

    cardRows = (data ?? []) as Flashcard[];
  }

  const cardsByDeck = new Map<string, Flashcard[]>();
  for (const card of cardRows) {
    const list = cardsByDeck.get(card.deck_id) ?? [];
    list.push(card);
    cardsByDeck.set(card.deck_id, list);
  }

  const decks: FlashcardDeckWithCards[] = (deckRows ?? []).map((deck) => {
    const cards = cardsByDeck.get(deck.id) ?? [];
    return {
      ...deck,
      card_count: cards.length,
      cards,
    };
  });

  const { data: noteRows } = await admin
    .schema('firstparty')
    .from('shift_notes')
    .select('content, updated_at, subject_id')
    .eq('student_id', student.id);

  const subjectIds = [...new Set((noteRows ?? []).map((row) => row.subject_id))];
  const subjectNameById = new Map<string, string>();

  if (subjectIds.length > 0) {
    const { data: subjectRows } = await admin
      .schema('firstparty')
      .from('shift_subjects')
      .select('id, name')
      .in('id', subjectIds);

    for (const row of subjectRows ?? []) {
      subjectNameById.set(row.id, row.name);
    }
  }

  const savedNotes: SavedNotesOption[] = (noteRows ?? [])
    .filter((row) => typeof row.content === 'string' && row.content.trim().length > 50)
    .map((row) => ({
      subjectId: row.subject_id,
      subjectName: subjectNameById.get(row.subject_id) || 'Subject notes',
      preview: row.content.trim().slice(0, 120),
      updatedAt: row.updated_at,
    }));

  return (
    <ShiftAiFlashcardsClient
      subjectOptions={subjectOptions}
      initialDecks={decks}
      savedNotes={savedNotes}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Smart Flashcards · Shift AI',
    robots: 'noindex',
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyDeckOwnership } from '@/lib/shift-ai/flashcards';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ deckId: string }> }
) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { deckId } = await context.params;
  const deck = await verifyDeckOwnership(deckId, auth.student.id);
  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('shift_flashcard_decks')
    .delete()
    .eq('id', deckId);

  if (error) {
    console.error('Shift AI flashcard deck delete failed:', error.message);
    return NextResponse.json({ error: 'Could not delete deck' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

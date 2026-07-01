import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type { GeneratedFlashcard } from '@/lib/shift-ai/flashcards-shared';

export type { Flashcard, FlashcardDeck, FlashcardDeckWithCards, GeneratedFlashcard, SavedNotesOption } from '@/lib/shift-ai/flashcards-shared';

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';

function parseGeneratedCards(raw: unknown): GeneratedFlashcard[] {
  let items: unknown[] = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.cards)) items = obj.cards;
  }

  const parsed: GeneratedFlashcard[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const front = typeof row.front === 'string' ? row.front.trim() : '';
    const back = typeof row.back === 'string' ? row.back.trim() : '';
    if (!front || !back) continue;
    parsed.push({ front, back });
  }

  return parsed;
}

export async function generateFlashcardDeck(
  input: {
    mode: 'topic' | 'notes';
    subject: string;
    content: string;
    cardCount: number;
    yearGroup: string;
    curriculum: string;
  }
): Promise<
  | { ok: true; deckTitle: string; cards: GeneratedFlashcard[] }
  | { ok: false; error: string }
> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI flashcard generator is temporarily unavailable' };
  }

  const { mode, subject, content, cardCount, yearGroup, curriculum } = input;
  const count = Math.min(30, Math.max(5, cardCount));

  const prompt =
    mode === 'topic'
      ? `Create ${count} high-quality flashcards for a ${yearGroup} student studying the topic "${content}" in ${subject} (${curriculum} curriculum).
Include a mix of key term definitions, conceptual questions, application prompts, and common misconception checks.
Make questions specific, not generic. Vary difficulty from foundational to challenging.`
      : `Create ${count} flashcards from the following ${subject} notes for a ${yearGroup} student (${curriculum} curriculum).
Identify the most important concepts, facts, and relationships. Create Q&A pairs that test understanding.

Notes:
"""
${content.slice(0, 4000)}
"""`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You create educational flashcards for school students. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      return { ok: false, error: 'Empty response from AI flashcard generator' };
    }

    const json = JSON.parse(rawContent) as unknown;
    const cards = parseGeneratedCards(json);

    if (cards.length < 3) {
      return { ok: false, error: 'Could not generate enough flashcards' };
    }

    let deckTitle = `${subject}: ${content.slice(0, 40)}`;
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const title = (json as Record<string, unknown>).deck_title;
      if (typeof title === 'string' && title.trim()) {
        deckTitle = title.trim();
      }
    }

    return { ok: true, deckTitle, cards: cards.slice(0, count) };
  } catch (err) {
    console.error('Shift AI flashcard generation failed:', err);
    return { ok: false, error: 'Could not generate flashcards' };
  }
}

export async function verifyDeckOwnership(deckId: string, studentId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data } = await admin
    .schema('firstparty')
    .from('shift_flashcard_decks')
    .select('id, student_id, subject, name')
    .eq('id', deckId)
    .maybeSingle();

  if (!data || data.student_id !== studentId) return null;
  return data;
}

export async function verifyCardOwnership(cardId: string, studentId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: card } = await admin
    .schema('firstparty')
    .from('shift_flashcards')
    .select(
      'id, deck_id, front, back, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at, created_at'
    )
    .eq('id', cardId)
    .maybeSingle();

  if (!card) return null;

  const deck = await verifyDeckOwnership(card.deck_id, studentId);
  if (!deck) return null;

  return card;
}

import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type { GeneratedFlashcard } from '@/lib/shift-ai/flashcards-shared';

export type { Flashcard, FlashcardDeck, FlashcardDeckWithCards, GeneratedFlashcard, SavedNotesOption } from '@/lib/shift-ai/flashcards-shared';

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 25_000;
const GENERATION_CARD_COUNT = 5;

function withGroqTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'AI flashcard generation timed out — please try again with shorter notes or a narrower topic'
          )
        );
      }, GROQ_TIMEOUT_MS);
    }),
  ]);
}

function parseGeneratedCards(
  raw: unknown
): { ok: true; cards: GeneratedFlashcard[] } | { ok: false; error: string } {
  let items: unknown[] = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.cards)) {
      items = obj.cards;
    } else {
      return { ok: false, error: 'Could not parse flashcard response' };
    }
  } else {
    return { ok: false, error: 'Could not parse flashcard response' };
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

  if (parsed.length === 0) {
    return { ok: false, error: 'Could not parse flashcard response' };
  }

  return { ok: true, cards: parsed };
}

export async function generateFlashcardDeck(
  input: {
    mode: 'topic' | 'notes';
    subject: string;
    content: string;
    yearGroup: string;
    curriculum: string;
    existingFronts?: string[];
  }
): Promise<
  | { ok: true; deckTitle: string; cards: GeneratedFlashcard[] }
  | { ok: false; error: string }
> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI flashcard generator is temporarily unavailable' };
  }

  const { mode, subject, content, yearGroup, curriculum, existingFronts = [] } = input;
  const count = GENERATION_CARD_COUNT;
  const avoidDupes =
    existingFronts.length > 0
      ? `\nDo NOT repeat or closely paraphrase these existing card fronts:\n${existingFronts
          .slice(0, 30)
          .map((front) => `- ${front}`)
          .join('\n')}`
      : '';

  const prompt =
    mode === 'topic'
      ? `Create exactly ${count} high-quality flashcard pairs for a ${yearGroup} student studying the topic "${content}" in ${subject} (${curriculum} curriculum).
Include a mix of key term definitions, conceptual questions, application prompts, and common misconception checks.
Make questions specific, not generic. Vary difficulty from foundational to challenging.
Return exactly ${count} cards — no more, no fewer.${avoidDupes}`
      : `Create exactly ${count} high-quality flashcard pairs from the following ${subject} notes for a ${yearGroup} student (${curriculum} curriculum).
Identify the most important concepts, facts, and relationships. Create Q&A pairs that test understanding.
Return exactly ${count} cards — no more, no fewer.${avoidDupes}

Notes:
"""
${content.slice(0, 4000)}
"""`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
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
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      })
    );

    const rawContent = completion.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      return { ok: false, error: 'Empty response from AI flashcard generator' };
    }

    let json: unknown;
    try {
      json = JSON.parse(rawContent);
    } catch {
      return { ok: false, error: 'Could not parse flashcard response' };
    }

    const parsed = parseGeneratedCards(json);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const cards = parsed.cards;
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
    if (
      err instanceof Error &&
      err.message.includes('AI flashcard generation timed out')
    ) {
      return { ok: false, error: err.message };
    }
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

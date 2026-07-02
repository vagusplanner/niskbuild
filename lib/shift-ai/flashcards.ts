import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import type { GeneratedFlashcard } from '@/lib/shift-ai/flashcards-shared';

export type { Flashcard, FlashcardDeck, FlashcardDeckWithCards, GeneratedFlashcard, SavedNotesOption } from '@/lib/shift-ai/flashcards-shared';

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';
const GROQ_TIMEOUT_MS = 25_000;
const GENERATION_CARD_COUNT = 5;

const FLASHCARD_JSON_ONLY_INSTRUCTION =
  'Respond with ONLY the raw JSON object. No markdown, no code fences, no explanation text before or after.';

function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```\s*$/i, '');
  return cleaned.trim();
}

/** Extract the outermost JSON object or array from mixed model output. */
function extractJsonSubstring(text: string): string {
  const cleaned = stripMarkdownFences(text);
  const objectStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');

  if (objectStart >= 0 && (arrayStart < 0 || objectStart < arrayStart)) {
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectEnd > objectStart) {
      return cleaned.slice(objectStart, objectEnd + 1);
    }
  }

  if (arrayStart >= 0) {
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayEnd > arrayStart) {
      return cleaned.slice(arrayStart, arrayEnd + 1);
    }
  }

  return cleaned;
}

function parseGroqJsonContent(
  content: string
): { ok: true; json: unknown } | { ok: false; error: string } {
  const candidates = [
    content.trim(),
    stripMarkdownFences(content),
    extractJsonSubstring(content),
  ];

  for (const candidate of [...new Set(candidates)]) {
    if (!candidate) continue;
    try {
      return { ok: true, json: JSON.parse(candidate) };
    } catch {
      // try next candidate
    }
  }

  return { ok: false, error: 'Could not parse flashcard response' };
}

function logFlashcardParseFailure(rawContent: string, reason: string) {
  console.error(
    `Shift AI flashcard ${reason}. Raw Groq response (truncated):`,
    rawContent.slice(0, 500)
  );
}

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
    } else if (Array.isArray(obj.flashcards)) {
      items = obj.flashcards;
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
Return exactly ${count} cards — no more, no fewer.${avoidDupes}

Return ONLY valid JSON in this shape:
{
  "deck_title": "Short deck name",
  "cards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}`
      : `Create exactly ${count} high-quality flashcard pairs from the following ${subject} notes for a ${yearGroup} student (${curriculum} curriculum).
Identify the most important concepts, facts, and relationships. Create Q&A pairs that test understanding.
Return exactly ${count} cards — no more, no fewer.${avoidDupes}

Notes:
"""
${content.slice(0, 4000)}
"""

Return ONLY valid JSON in this shape:
{
  "deck_title": "Short deck name",
  "cards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You create educational flashcards for school students. ${FLASHCARD_JSON_ONLY_INSTRUCTION}`,
          },
          {
            role: 'user',
            content: `${prompt}\n\n${FLASHCARD_JSON_ONLY_INSTRUCTION}`,
          },
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

    const jsonResult = parseGroqJsonContent(rawContent);
    if (!jsonResult.ok) {
      logFlashcardParseFailure(rawContent, 'JSON parse failed');
      return { ok: false, error: jsonResult.error };
    }

    const json = jsonResult.json;
    const parsed = parseGeneratedCards(json);
    if (!parsed.ok) {
      logFlashcardParseFailure(rawContent, 'response shape parse failed');
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

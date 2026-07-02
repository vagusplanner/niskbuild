import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  parseGroqJsonContent,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';

export type BuddyGameId = 'phonics' | 'reading' | 'counting';

export type BuddyGame = {
  id: BuddyGameId;
  label: string;
  emoji: string;
  desc: string;
};

export const BUDDY_GAMES: BuddyGame[] = [
  {
    id: 'phonics',
    label: 'Letter Sounds',
    emoji: '🔤',
    desc: 'Find the letter that makes a sound',
  },
  {
    id: 'reading',
    label: 'Word Time',
    emoji: '📖',
    desc: 'Read simple words with your buddy',
  },
  {
    id: 'counting',
    label: 'Counting Fun',
    emoji: '🔢',
    desc: 'Count along with your buddy',
  },
];

export type BuddyRound = {
  prompt: string;
  expected: string;
  praise: string;
  encouragement: string;
};

export type BuddyEvaluation = {
  correct: boolean;
  message: string;
};

function gameLabel(gameId: BuddyGameId): string {
  return BUDDY_GAMES.find((g) => g.id === gameId)?.label ?? gameId;
}

export async function generateVoiceBuddyRound(
  gameId: BuddyGameId,
  friendName: string
): Promise<{ ok: true; round: BuddyRound } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Voice Buddy is temporarily unavailable' };
  }

  const game = BUDDY_GAMES.find((g) => g.id === gameId);
  const prompt = `You are ${friendName}, a friendly cartoon buddy talking to a 4-7 year old child.
Game: "${game?.label ?? gameId}" — ${game?.desc ?? ''}.

Create ONE simple, playful round. Use very simple words (max 12 words in prompt).
${GROQ_JSON_ONLY_INSTRUCTION}

JSON shape:
{
  "prompt": "what you say to the child",
  "expected": "the correct short answer",
  "praise": "warm praise if correct (one short sentence)",
  "encouragement": "gentle nudge if wrong (one short sentence)"
}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You create short, playful learning games for preschool and early primary children. Keep every field brief and cheerful.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 220,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse Voice Buddy round');
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const data = parsed.json as Record<string, unknown>;
    const round: BuddyRound = {
      prompt: String(data.prompt ?? '').trim(),
      expected: String(data.expected ?? '').trim(),
      praise: String(data.praise ?? 'Great job!').trim(),
      encouragement: String(data.encouragement ?? "Let's try again!").trim(),
    };

    if (!round.prompt || !round.expected) {
      return { ok: false, error: 'Voice Buddy could not create a round' };
    }

    return { ok: true, round };
  } catch (error) {
    console.error('Voice Buddy round error:', error);
    return { ok: false, error: 'Voice Buddy is temporarily unavailable' };
  }
}

export async function evaluateVoiceBuddyAnswer(
  gameId: BuddyGameId,
  prompt: string,
  expected: string,
  transcript: string
): Promise<{ ok: true; evaluation: BuddyEvaluation } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Voice Buddy is temporarily unavailable' };
  }

  const userPrompt = `A 4-7 year old is playing "${gameLabel(gameId)}".
You asked: "${prompt}"
Expected answer: "${expected}"
Child said: "${transcript}"

Be generous — toddlers mumble and letters can sound similar.
${GROQ_JSON_ONLY_INSTRUCTION}

JSON shape:
{
  "correct": true or false,
  "message": "one very short warm sentence to speak back (max 15 words)"
}`;

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        model: SHIFT_GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You gently evaluate young children’s spoken answers. Reply with one short, encouraging sentence.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 120,
        response_format: { type: 'json_object' },
      })
    );

    const raw = completion.choices[0]?.message?.content ?? '';
    const parsed = parseGroqJsonContent(raw, 'Could not parse Voice Buddy evaluation');
    if (!parsed.ok) return { ok: false, error: parsed.error };

    const data = parsed.json as Record<string, unknown>;
    const evaluation: BuddyEvaluation = {
      correct: Boolean(data.correct),
      message: String(data.message ?? (data.correct ? 'Great job!' : "Let's try again!")).trim(),
    };

    return { ok: true, evaluation };
  } catch (error) {
    console.error('Voice Buddy evaluate error:', error);
    return { ok: false, error: 'Voice Buddy is temporarily unavailable' };
  }
}

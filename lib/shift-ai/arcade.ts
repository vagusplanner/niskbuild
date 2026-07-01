import 'server-only';

import { getGroqClient } from '@/lib/groq-client';
import {
  ARCADE_QUESTION_COUNT,
  type ArcadeQuestion,
} from '@/lib/shift-ai/arcade-shared';

export {
  ARCADE_BASE_POINTS,
  ARCADE_GAME_DURATION_SEC,
  ARCADE_QUESTION_COUNT,
  ARCADE_STREAK_BONUS,
  computeArcadeAnswerPoints,
  type ArcadeQuestion,
  type ArcadeScoreRecord,
} from '@/lib/shift-ai/arcade-shared';

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';

function normalizeOptions(raw: unknown): [string, string, string, string] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const options = raw.map((item) => (typeof item === 'string' ? item.trim() : ''));
  if (options.some((opt) => !opt)) return null;
  return options as [string, string, string, string];
}

export function parseArcadeQuestions(raw: unknown): ArcadeQuestion[] {
  let items: unknown[] = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.questions)) {
      items = obj.questions;
    }
  }

  const parsed: ArcadeQuestion[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const question = typeof row.question === 'string' ? row.question.trim() : '';
    const options = normalizeOptions(row.options);
    const correctIndexRaw =
      typeof row.correctIndex === 'number'
        ? row.correctIndex
        : typeof row.correct_index === 'number'
          ? row.correct_index
          : NaN;
    const socraticHint =
      typeof row.socraticHint === 'string'
        ? row.socraticHint.trim()
        : typeof row.socratic_hint === 'string'
          ? row.socratic_hint.trim()
          : '';

    if (!question || !options || !Number.isInteger(correctIndexRaw)) continue;
    if (correctIndexRaw < 0 || correctIndexRaw > 3) continue;
    if (!socraticHint) continue;

    parsed.push({
      question,
      options,
      correctIndex: correctIndexRaw,
      socraticHint,
    });

    if (parsed.length >= ARCADE_QUESTION_COUNT) break;
  }

  return parsed;
}

export async function generateArcadeQuestions(
  subject: string,
  yearGroup: string,
  curriculum: string
): Promise<{ ok: true; questions: ArcadeQuestion[] } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI quiz generator is temporarily unavailable' };
  }

  const prompt = `Generate exactly 10 multiple choice quiz questions for a ${yearGroup} student studying ${subject} in the ${curriculum} curriculum.

Rules:
- Each question must have exactly 4 answer options with only one correct answer
- Questions should be engaging, age-appropriate, and quick to read
- Mix difficulty from easy to medium
- socraticHint must be a simpler guiding question that helps the student think toward the answer WITHOUT revealing it

Return ONLY valid JSON in this shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "socraticHint": "A simpler question to guide them if they get it wrong"
    }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You create educational multiple-choice quizzes for school students. Respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: 'Empty response from AI quiz generator' };
    }

    const json = JSON.parse(content) as unknown;
    const questions = parseArcadeQuestions(json);

    if (questions.length < ARCADE_QUESTION_COUNT) {
      return { ok: false, error: 'Could not generate enough quiz questions' };
    }

    return { ok: true, questions: questions.slice(0, ARCADE_QUESTION_COUNT) };
  } catch (err) {
    console.error('Shift AI arcade question generation failed:', err);
    return { ok: false, error: 'Could not generate quiz questions' };
  }
}

import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT_BASE =
  'You are a helpful AI study tutor for students aged 7-17. Adapt your language to be age-appropriate. Be encouraging, clear, and educational. Never provide answers directly — guide the student to understand.';

export type ShiftChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  subject: string | null;
  created_at: string;
};

export type ShiftChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ShiftStudentTutorContext = {
  year_group: string;
  key_stage: string;
  age_range: string;
  curriculum: string;
};

function buildSystemPrompt(ctx: ShiftStudentTutorContext, subject?: string | null): string {
  const parts = [
    SYSTEM_PROMPT_BASE,
    `The student is in ${ctx.year_group} (${ctx.key_stage}), age range ${ctx.age_range}, following the ${ctx.curriculum} curriculum.`,
  ];

  if (subject?.trim()) {
    parts.push(`The student is currently asking about: ${subject.trim()}.`);
  }

  return parts.join('\n\n');
}

export async function generateShiftAiTutorReply(
  message: string,
  history: ShiftChatHistoryMessage[],
  ctx: ShiftStudentTutorContext,
  subject?: string | null
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'AI tutor is temporarily unavailable' };
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt(ctx, subject) },
  ];

  for (const entry of history.slice(-18)) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: message });

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: 'Empty response from AI tutor' };
    }

    return { ok: true, content };
  } catch (err) {
    console.error('Shift AI tutor Groq error:', err);
    return { ok: false, error: 'Could not generate a response' };
  }
}

import 'server-only';

import type { ShiftChatHistoryMessage, ShiftStudentTutorContext } from '@/lib/shift-ai/assistant';
import { getGroqClient } from '@/lib/groq-client';
import { SHIFT_GROQ_MODEL, withGroqTimeout } from '@/lib/shift-ai/groq-json';

function buildVoiceTutorSystemPrompt(
  ctx: ShiftStudentTutorContext,
  subject?: string | null,
  aiPersona?: string | null
): string {
  const curriculumName = ctx.curriculumLabel || ctx.curriculum;
  const subjectLine = subject?.trim()
    ? `You are a ${subject.trim()} voice tutor for a ${ctx.year_group} student studying ${curriculumName}.`
    : `You are a friendly voice tutor for a ${ctx.year_group} student studying ${curriculumName}.`;

  const parts = [
    subjectLine,
    `Student level: ${ctx.key_stage} (ages ${ctx.age_range}).`,
    'This is a SPOKEN voice conversation. Keep every reply SHORT — 2 to 4 sentences maximum.',
    'Sound conversational and encouraging. Guide with hints and questions; do not dump full answers.',
    'Never mention that you are an AI.',
  ];

  if (aiPersona?.trim()) {
    parts.push(`Teaching style: ${aiPersona.trim()}`);
  }

  return parts.join('\n');
}

export async function generateVoiceTutorReply(
  message: string,
  history: ShiftChatHistoryMessage[],
  ctx: ShiftStudentTutorContext,
  subject?: string | null,
  aiPersona?: string | null
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  const groq = getGroqClient();
  if (!groq) {
    return { ok: false, error: 'Voice Tutor is temporarily unavailable' };
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildVoiceTutorSystemPrompt(ctx, subject, aiPersona) },
  ];

  for (const entry of history.slice(-6)) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: message });

  try {
    const completion = await withGroqTimeout(
      groq.chat.completions.create({
        messages,
        model: SHIFT_GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 280,
      })
    );

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return { ok: false, error: 'Voice Tutor returned an empty response' };
    }

    return { ok: true, content };
  } catch (error) {
    console.error('Voice Tutor error:', error);
    return { ok: false, error: 'Voice Tutor is temporarily unavailable' };
  }
}

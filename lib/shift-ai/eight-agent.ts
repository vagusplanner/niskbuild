/**
 * SuperEduc8 "8" — product help agent (not AI Tutor).
 * Grounded in Tips corpus; never invents unshipped features.
 */

import 'server-only';

import { GROQ_CODE_MODEL, getGroqClient } from '@/lib/groq-client';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

export type EightMessage = { role: 'user' | 'assistant'; content: string };

export type EightAgentContext = {
  pathname?: string | null;
  hostname?: string;
  planLabel?: string | null;
  retrievedKnowledge?: string;
};

export type EightAgentResult = {
  response: string;
  provider: 'groq' | 'canned';
  citations?: { type: string; href: string; title: string }[];
};

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || GROQ_CODE_MODEL;

/** Clear homework / study-answer asks → redirect to AI Tutor (no LLM). */
export function isHomeworkOrStudyAnswerRequest(message: string): boolean {
  const m = message.toLowerCase().trim();
  if (m.length < 8) return false;

  const productHints =
    /\b(billing|subscribe|cancel|password|flashcard|signup|trial|account|settings|portal|delete|export|parent|tips|how do i (use|open|find|change))\b/i;
  if (productHints.test(m)) return false;

  const studyHints = [
    /\b(solve|calculate|equation|algebra|quadratic)\b/,
    /\b(what(?:'s| is) the (answer|solution) (to|for))\b/,
    /\b(help me (with|do) (my )?homework)\b/,
    /\b(explain (this|the) (passage|poem|essay|paragraph))\b/,
    /\b(write (an? |my )?(essay|paragraph|introduction) (for|about|on))\b/,
    /\b(translate this (sentence|paragraph|text))\b/,
    /\b(check my (math|work|answers?))\b/,
  ];
  return studyHints.some((re) => re.test(m));
}

function buildSystemPrompt(ctx: EightAgentContext): string {
  const tipsPath = shiftAiAppPath('/tips', ctx.hostname);
  const tutorPath = shiftAiAppPath('/assistant', ctx.hostname);
  const billingPath = shiftAiAppPath('/billing', ctx.hostname);
  const settingsPath = shiftAiAppPath('/settings', ctx.hostname);
  const path = ctx.pathname || 'unknown';
  const plan = ctx.planLabel || 'unknown';

  return `You are **8** — SuperEduc8's in-app product guide (named after the "8" in Educ8 / the logo).
You help with how to use SuperEduc8 itself: features, navigation, billing, and account.
You are NOT the AI Tutor. You never solve homework, mark essays, or teach curriculum content.

Tone (role-aware — one assistant, not two bots):
- Feature / "how do I…" questions that sound like a student: friendly, simple, short steps.
- Billing, cancel, payment, delete-account, export: clear adult language, direct, no fluff.

Hard rules:
- Only describe features that appear in the retrieved Tips below OR in this shipped list:
  Signup (self 13+ / supervised / family), curriculum & subjects in Settings, AI Tutor Chat, Snap Homework, Flashcards, Quiz Arcade, Essay Marker, Voice Tutor / Voice Buddy, Billing (14-day trial no card, Student/Family subscribe with child quantity 0–20, automatic multi-curriculum discount when eligible, Stripe customer portal for manage/cancel), Settings Account (password, JSON export, delete account), parent invite links & parent dashboard (progress summaries — not full tutor transcripts), Tips & Help page.
- Do NOT invent or imply: avatar upload, in-app email change, OAuth connected-accounts UI, notification preferences, or any other unbuilt feature. If asked, say it is not available yet and point to what does exist.
- If unsure after Tips: say you don't know and suggest ${tipsPath} or ${billingPath} / ${settingsPath} as appropriate.
- Homework / study answers: tell them to open AI Tutor (${tutorPath}) — do not answer the academic question.
- Prefer short bullet steps. Cite Deep-link paths from retrieved Tips when you rely on them.
- If Current page already matches the answer (e.g. user is on ${billingPath} asking about cancel), say they are already there and point to the exact control (Subscribe / Open billing portal).
- Do not invent button labels, gestures, or UI chrome that are not in the Tips. Prefer Tips wording (e.g. open Smart Flashcards, Create or generate a deck, flip through reviews). If Tips do not name a button, say "open Smart Flashcards" without inventing labels.

User context:
- Current page: ${path}
- Plan access label: ${plan}

${ctx.retrievedKnowledge?.trim() ? ctx.retrievedKnowledge.trim() : '(No tip excerpts retrieved — stay conservative; do not invent.)'}

Keep answers under ~150 words unless the user asks for more detail.`;
}

export async function runSe8EightAgent(
  message: string,
  ctx: EightAgentContext,
  history: EightMessage[] = [],
  citations: { type: string; href: string; title: string }[] = []
): Promise<EightAgentResult> {
  const tutorPath = shiftAiAppPath('/assistant', ctx.hostname);

  if (isHomeworkOrStudyAnswerRequest(message)) {
    return {
      response: `I'm **8** — I help with using SuperEduc8 (features, billing, account), not with homework answers.\n\nFor study help, open **AI Tutor** (${tutorPath}) and ask there. It guides you to understand instead of just giving the answer.`,
      provider: 'canned',
      citations: [
        {
          type: 'tips',
          href: tutorPath,
          title: 'AI Tutor Chat',
        },
      ],
    };
  }

  const groq = getGroqClient();
  if (!groq) {
    const tipsPath = shiftAiAppPath('/tips', ctx.hostname);
    return {
      response: `I can't reach the help AI right now. Browse **Tips & Help** (${tipsPath}) for short how-tos on trial, billing, flashcards, and more.`,
      provider: 'canned',
      citations: [{ type: 'tips', href: tipsPath, title: 'Tips & Help' }],
    };
  }

  const system = buildSystemPrompt(ctx);
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: system },
  ];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: message });

  const completion = await groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: 0.4,
    max_tokens: 450,
  });

  const response =
    completion.choices[0]?.message?.content?.trim() ||
    `I couldn't form an answer. Try Tips & Help (${shiftAiAppPath('/tips', ctx.hostname)}).`;

  return { response, provider: 'groq', citations };
}

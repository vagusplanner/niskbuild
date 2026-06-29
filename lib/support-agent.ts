import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

export type SupportAgentMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type SupportAgentContext = {
  userEmail?: string;
  userName?: string;
  userTier?: string;
  subscriptionStatus?: string;
};

export type SupportAgentOutcome = 'direct' | 'escalated';

export interface SupportAgentResult {
  outcome: SupportAgentOutcome;
  reply: string;
  escalationSubject?: string;
  escalationSummary?: string;
}

const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';

function buildSupportAgentSystemPrompt(ctx: SupportAgentContext): string {
  return `You are NiskBuild Support Agent — first-line help for billing, builder, exports, and account questions.

User: ${ctx.userName || 'Member'} (${ctx.userEmail || 'unknown'})
Plan: ${ctx.userTier || 'sandbox'} (${ctx.subscriptionStatus || 'inactive'})

Respond with ONLY valid JSON (no markdown fences):
{
  "outcome": "direct" | "escalated",
  "reply": "user-facing message",
  "escalationSubject": "short ticket subject if escalated",
  "escalationSummary": "internal summary for admin if escalated"
}

Rules:
- outcome "direct" ONLY when you are 100% certain the answer is accurate from the facts below. Give concise, actionable steps.
- outcome "escalated" when the question needs account lookup, refunds, tier changes, bug investigation, data recovery, or you are not fully sure. Still give safe general guidance in "reply" but say a human will confirm before any account action.
- Never promise refunds, credits, or tier changes without escalation.
- Never invent features.

Platform facts:
- Sandbox ($0): 1 project, local preview, watermarked export
- Basic ($69/mo): 5 projects, clean ZIP + PWA, 150 cloud credits
- Pro Worker ($129/mo): BYOC, Google Places, games, 600 credits, support tickets
- Agency+ ($299+): preview links, team seats, App Store export, higher credits
- Support tickets: Pro+ at /dashboard/support
- Docs: /docs · Brand kit: /brand · Builder: /builder`;
}

function parseSupportAgentJson(raw: string): SupportAgentResult | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      outcome?: string;
      reply?: string;
      escalationSubject?: string;
      escalationSummary?: string;
    };
    if (!parsed.reply?.trim()) return null;
    const outcome: SupportAgentOutcome =
      parsed.outcome === 'direct' ? 'direct' : 'escalated';
    return {
      outcome,
      reply: parsed.reply.trim(),
      escalationSubject: parsed.escalationSubject?.trim(),
      escalationSummary: parsed.escalationSummary?.trim(),
    };
  } catch {
    return null;
  }
}

export async function runSupportAgent(
  message: string,
  ctx: SupportAgentContext,
  history: SupportAgentMessage[] = []
): Promise<SupportAgentResult> {
  const groq = getGroqClient();
  if (!groq) {
    return {
      outcome: 'escalated',
      reply:
        'Support AI is temporarily unavailable. Please open a ticket or use the contact form — our team will respond by email.',
      escalationSubject: 'Support AI unavailable',
      escalationSummary: message,
    };
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSupportAgentSystemPrompt(ctx) },
  ];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: message });

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const parsed = parseSupportAgentJson(raw);
    if (parsed) return parsed;
  } catch {
    /* fall through */
  }

  return {
    outcome: 'escalated',
    reply:
      'I want to make sure we get this right — I have opened a ticket for our team. They will confirm any account-specific steps before we proceed.',
    escalationSubject: message.slice(0, 80) || 'Support agent escalation',
    escalationSummary: message,
  };
}

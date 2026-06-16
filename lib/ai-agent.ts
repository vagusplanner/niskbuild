import 'server-only';

import { getGroqClient } from '@/lib/groq-client';

export type AgentPromptType = 'simple' | 'complex';
export type AgentMode = 'user' | 'admin';
export type AgentProvider = 'ollama' | 'groq';
export type PreferredProvider = 'auto' | 'ollama' | 'groq';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentContext {
  userTier?: string;
  projectName?: string;
  userEmail?: string;
  mode?: AgentMode;
  adminStats?: string;
  preferredProvider?: PreferredProvider;
}

const COMPLEX_KEYWORDS = [
  'code',
  'build',
  'create',
  'generate',
  'debug',
  'fix',
  'error',
  'architecture',
  'database',
  'schema',
  'api',
  'integration',
  'component',
  'react',
  'tailwind',
  'typescript',
  'stripe',
  'webhook',
  'deploy',
  'export',
  'ollama',
  'groq',
];

const OLLAMA_URL = process.env.OLLAMA_URL?.trim() || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_AGENT_MODEL?.trim() || 'llama3.2:3b';
const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || 'llama-3.3-70b-versatile';

export function classifyAgentPrompt(message: string): AgentPromptType {
  const lower = message.toLowerCase();
  if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) return 'complex';
  if (message.split(/\s+/).filter(Boolean).length > 20) return 'complex';
  return 'simple';
}

function buildUserSystemPrompt(ctx: AgentContext, promptType: AgentPromptType): string {
  const tier = ctx.userTier || 'sandbox';
  const project = ctx.projectName || 'No active project';

  const base = `You are NiskBuild Help — a friendly in-app assistant for the NiskBuild website builder platform.
User plan: ${tier}. Active project: ${project}.

Platform facts (accurate as of 2026):
- Sandbox ($0): 1 project, local preview, local Ollama optional, no cloud credits, watermarked/locked export
- Basic ($69/mo): 5 projects, clean ZIP + PWA export, 150 cloud credits, no BYOC, no Google Places
- Pro Worker ($129/mo): BYOC, Google Places AI, Phaser games, 600 credits, support tickets
- Agency+ ($299+): preview links, team features, higher credits
- Billing: /pricing · Settings: /dashboard/settings · Human support: /dashboard/support (Pro+ tickets) or /landing#contact (Basic/Sandbox form)
- Builder shortcuts: ⌘+Enter generate, ⌘+S save, ⌘+B inspector, F fullscreen
- Reload packs on pricing page; annual billing saves 2 months

Rules:
- Be concise and actionable. Prefer bullet steps for how-to questions.
- Never invent features. If unsure, suggest human support or docs.
- Do not generate full application code — guide the user to use the builder Generate button instead.
- For billing disputes or account deletion, direct to support.`;

  if (promptType === 'complex') {
    return `${base}

You may give detailed technical guidance (React, Tailwind, Next.js, debugging tips) but keep answers under 250 words unless code snippet is essential.`;
  }

  return `${base}

Keep answers under 120 words. Focus on navigation, plans, FAQ, and quick how-to.`;
}

function buildAdminSystemPrompt(ctx: AgentContext): string {
  return `You are NiskBuild Admin Copilot — an internal ops assistant for the platform administrator.
Admin email context: ${ctx.userEmail || 'admin'}.

${ctx.adminStats ? `Live snapshot:\n${ctx.adminStats}\n` : ''}

You help with:
- Interpreting user tiers, credits, subscription status
- Support ticket triage (/admin/support) — reply, discounts 0–100%, status updates
- User management (/admin/users) — tier overrides, discount slider
- Stripe: checkout webhooks at /api/webhooks, price IDs in env
- Common issues: migrations not run (support_tickets, project_versions), webhook misconfig, Ollama only works locally not on Vercel server

Be precise, ops-focused, and suggest concrete admin UI paths. Never expose secrets or raw API keys.`;
}

function toChatMessages(
  systemPrompt: string,
  message: string,
  history: AgentMessage[]
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];
  for (const m of history.slice(-6)) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: message });
  return messages;
}

async function generateWithOllama(
  messages: { role: string; content: string }[]
): Promise<string | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: 0.7, num_predict: 400 },
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as { message?: { content?: string } };
    const text = data.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function generateWithGroq(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const groq = getGroqClient();
  if (!groq) {
    return "Cloud AI isn't configured right now. Try again later or contact support at /landing#contact.";
  }

  const completion = await groq.chat.completions.create({
    messages,
    model: GROQ_MODEL,
    temperature: 0.6,
    max_tokens: promptTypeMaxTokens(messages),
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "I couldn't process that. Please try rephrasing or contact support."
  );
}

function promptTypeMaxTokens(
  messages: { role: string; content: string }[]
): number {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  if (system.includes('Admin Copilot')) return 700;
  if (system.includes('detailed technical')) return 600;
  return 350;
}

export interface AgentRunResult {
  response: string;
  provider: AgentProvider;
  promptType: AgentPromptType;
}

export async function runHelpAgent(
  message: string,
  ctx: AgentContext,
  conversationHistory: AgentMessage[] = []
): Promise<AgentRunResult> {
  const mode = ctx.mode || 'user';
  const preferred = ctx.preferredProvider || 'auto';
  const promptType = mode === 'admin' ? 'complex' : classifyAgentPrompt(message);

  const systemPrompt =
    mode === 'admin'
      ? buildAdminSystemPrompt(ctx)
      : buildUserSystemPrompt(ctx, promptType);

  const messages = toChatMessages(systemPrompt, message, conversationHistory);

  async function groqThenOllama(): Promise<AgentRunResult> {
    try {
      const response = await generateWithGroq(messages);
      return { response, provider: 'groq', promptType };
    } catch {
      const fallback = await generateWithOllama(messages);
      if (fallback) return { response: fallback, provider: 'ollama', promptType };
      throw new Error('All AI providers unavailable');
    }
  }

  async function ollamaThenGroq(): Promise<AgentRunResult> {
    const ollamaResponse = await generateWithOllama(messages);
    if (ollamaResponse) {
      return { response: ollamaResponse, provider: 'ollama', promptType };
    }
    const groqResponse = await generateWithGroq(messages);
    return { response: groqResponse, provider: 'groq', promptType };
  }

  if (preferred === 'groq') {
    return groqThenOllama();
  }

  if (preferred === 'ollama') {
    return ollamaThenGroq();
  }

  // auto: route by complexity (admin always cloud-first)
  if (mode === 'admin' || promptType === 'complex') {
    return groqThenOllama();
  }

  return ollamaThenGroq();
}

export interface AgentAnalytics {
  total: number;
  simple: number;
  complex: number;
  ollama: number;
  groq: number;
  last7Days: number;
}

export function computeAgentAnalytics(
  rows: { prompt_type: string; provider: string; created_at: string }[]
): AgentAnalytics {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  return {
    total: rows.length,
    simple: rows.filter((r) => r.prompt_type === 'simple').length,
    complex: rows.filter((r) => r.prompt_type === 'complex').length,
    ollama: rows.filter((r) => r.provider === 'ollama').length,
    groq: rows.filter((r) => r.provider === 'groq').length,
    last7Days: rows.filter((r) => now - new Date(r.created_at).getTime() <= weekMs).length,
  };
}

import 'server-only';

import { GROQ_CODE_MODEL, getGroqClient } from '@/lib/groq-client';
import { describeBuilderSurface } from '@/lib/nisk-retrieval';
import type { BuilderSurfaceContext } from '@/lib/nisk-context';

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
  /** Current Next.js pathname, e.g. /builder */
  pathname?: string;
  builderSurface?: BuilderSurfaceContext | null;
  /** Pre-fetched docs/tips excerpts from retrieveNiskKnowledge */
  retrievedKnowledge?: string;
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
const GROQ_MODEL = process.env.GROQ_AGENT_MODEL?.trim() || GROQ_CODE_MODEL;

export function classifyAgentPrompt(message: string): AgentPromptType {
  const lower = message.toLowerCase();
  if (COMPLEX_KEYWORDS.some((kw) => lower.includes(kw))) return 'complex';
  if (message.split(/\s+/).filter(Boolean).length > 20) return 'complex';
  return 'simple';
}

function buildUserSystemPrompt(ctx: AgentContext, promptType: AgentPromptType): string {
  const tier = ctx.userTier || 'sandbox';
  const project = ctx.projectName || 'No active project';
  const path = ctx.pathname || 'unknown';
  const surface = describeBuilderSurface(ctx.builderSurface);

  const base = `You are Nisk — a named in-app guide for NiskBuild. You know the product inside and out and talk like a smart colleague, not a scripted support bot or a corporate FAQ.

Tone:
- Knowledgeable and genuinely helpful. Concise by default (users are often mid-task); go deeper when they ask.
- Encouraging without being saccharine. If someone is stuck, acknowledge it's a fair question — don't be falsely cheerful about confusion.
- Never invent features. If unsure, say so and point to /docs, /tips, or human support.

User context:
- Plan: ${tier}
- Active project: ${project}
- Current page: ${path}${surface ? `\n- Builder UI: ${surface}` : ''}

Current product IA (accurate — prefer this over older memories):
- Builder canvas header: Save and Deploy are primary buttons; Menu ▾ is grouped into View / Edit / Project & share.
- Inspector (Code toggle, ⌘/Ctrl+B, or Menu → Show inspector): Code (file tree + editor) and Styles (when Visual edit has a selected element) only.
- Project Settings (gear / "Project" in the canvas header): SEO, Integrations, Blueprint (read-only), AI/Ollama, Credits/ROI — these used to live in the inspector and moved here.
- Shortcuts: ⌘/Ctrl+S save · ⌘/Ctrl+B inspector · F fullscreen · ⌘/Ctrl+Enter generate (when focused in the prompt).
- Help & docs: ? in the header or account menu opens the searchable docs panel (same corpus as /docs). Tips: /tips. Support: /dashboard/support (Pro+ tickets) or contact on pricing/landing for lower tiers.
- Plans (high level): Sandbox free trial → Basic ($69) ZIP/PWA → Pro Worker ($129) Places/BYOC/games → Agency+ ($299+) native export & teams. Details: /pricing and /docs/plans-explained when available.

Rules:
- Prefer short bullet steps for how-tos.
- When retrieved knowledge is provided below, ground answers in it and cite the Source links (e.g. /docs/… or /tips).
- If the user is already on the relevant UI (see Builder UI above), say so — don't send them on a navigation scavenger hunt.
- Do not generate full application code — guide them to Builder → Generate instead.
- For billing disputes or account deletion, direct to support.`;

  const knowledge = ctx.retrievedKnowledge?.trim()
    ? `\n\n${ctx.retrievedKnowledge.trim()}`
    : '';

  if (promptType === 'complex') {
    return `${base}

You may give detailed technical guidance (React, Tailwind, Next.js, debugging tips) but keep answers under 250 words unless a short code snippet is essential.${knowledge}`;
  }

  return `${base}

Keep answers under 120 words unless retrieved docs need a bit more. Focus on navigation, plans, and quick how-to.${knowledge}`;
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
    return "Cloud AI isn't configured right now. Try again later or contact support at /landing-v2#contact.";
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
  if (system.includes('Retrieved product knowledge')) return 550;
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

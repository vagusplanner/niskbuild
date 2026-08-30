import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import {
  getStreamProviderOrder,
  type AIProvider,
} from '@/lib/ai-providers';
import { getGroqClient } from '@/lib/groq-client';
import {
  VP_ART9_GROQ_UNAVAILABLE_MESSAGE,
  requiresGroqOnlyProvider,
} from '@/lib/vp-gdpr/art9-ai-gate';
import type { VpArt9Category } from '@/lib/vp-gdpr/tables';
import {
  GROQ_JSON_ONLY_INSTRUCTION,
  SHIFT_GROQ_MODEL,
  isGroqJsonValidationFailure,
  withGroqCall,
  withGroqTimeout,
} from '@/lib/shift-ai/groq-json';

const TOGETHER_CHAT_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const ANTHROPIC_CHAT_MODEL = 'claude-3-sonnet-20240229';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

export const VP_TRANSCRIPTION_UNAVAILABLE_MESSAGE =
  'Voice transcription is temporarily unavailable — please try again shortly or type your request instead';

export type VpChatRole = 'system' | 'user' | 'assistant';

export type VpChatMessage = {
  role: VpChatRole;
  content: string;
};

export type VpChatCompletionOptions = {
  messages: VpChatMessage[];
  userTier?: string;
  label?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** When non-empty, provider chain is restricted to Groq (no Together/Anthropic fallback). */
  art9Categories?: VpArt9Category[];
};

export type VpChatCompletionResult =
  | { ok: true; content: string; provider: AIProvider }
  | {
      ok: false;
      error: string;
      triedProviders: AIProvider[];
      code?: 'VP_ART9_GROQ_ONLY_UNAVAILABLE';
    };

type OpenAiCompatibleClient = {
  chat: {
    completions: {
      create: (params: Record<string, unknown>) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
};

function getTogetherClient(): OpenAiCompatibleClient | null {
  const apiKey = process.env.TOGETHER_API_KEY?.trim();
  if (!apiKey) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require('openai');
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.together.xyz/v1',
  });
}

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

/** Server-side VP chat order — mirrors builder stream order, excludes local/Ollama. */
export function getVpChatProviderOrder(
  userTier = 'free',
  art9Categories: VpArt9Category[] = []
): AIProvider[] {
  if (requiresGroqOnlyProvider(art9Categories)) {
    return getGroqClient() ? (['groq'] as AIProvider[]) : [];
  }
  return getStreamProviderOrder(userTier).filter(
    (provider) => provider !== 'local' && provider !== 'openai'
  );
}

export function isAnyVpChatProviderConfigured(): boolean {
  return (
    !!getGroqClient() ||
    !!process.env.TOGETHER_API_KEY?.trim() ||
    !!process.env.ANTHROPIC_API_KEY?.trim()
  );
}

export function isAnyVpTranscriptionProviderConfigured(): boolean {
  return !!getGroqClient();
}

function splitSystemUser(messages: VpChatMessage[]): {
  system: string;
  conversation: VpChatMessage[];
} {
  const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const conversation = messages.filter((m) => m.role !== 'system');
  return {
    system: systemParts.join('\n\n'),
    conversation,
  };
}

async function runGroqChat(opts: VpChatCompletionOptions): Promise<string> {
  const groq = getGroqClient();
  if (!groq) throw new Error('Groq API key not configured');

  const label = opts.label ?? 'vp-chat';
  const request = (jsonMode: boolean) =>
    groq.chat.completions.create({
      model: SHIFT_GROQ_MODEL,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.65,
      max_tokens: opts.maxTokens ?? 4096,
      ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    });

  try {
    const completion = await withGroqCall(() => request(!!opts.jsonMode), { label: `${label}/groq` });
    return completion.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (error) {
    if (!opts.jsonMode || !isGroqJsonValidationFailure(error)) throw error;
    console.warn(`VP AI [${label}] Groq json_object rejected — retrying without response_format`);
    const completion = await withGroqCall(() => request(false), { label: `${label}/groq-no-json` });
    return completion.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

async function runTogetherChat(opts: VpChatCompletionOptions): Promise<string> {
  const client = getTogetherClient();
  if (!client) throw new Error('Together AI not configured');

  const completion = await withGroqTimeout(
    client.chat.completions.create({
      model: TOGETHER_CHAT_MODEL,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.65,
      max_tokens: opts.maxTokens ?? 4096,
      ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
    })
  );

  return completion.choices?.[0]?.message?.content?.trim() ?? '';
}

async function runAnthropicChat(opts: VpChatCompletionOptions): Promise<string> {
  const client = getAnthropicClient();
  if (!client) throw new Error('Anthropic not configured');

  const { system, conversation } = splitSystemUser(opts.messages);
  const userContent = conversation
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n\n');
  const prompt = opts.jsonMode
    ? `${userContent}\n\n${GROQ_JSON_ONLY_INSTRUCTION}`
    : userContent;

  const message = await withGroqTimeout(
    client.messages.create({
      model: ANTHROPIC_CHAT_MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.65,
      system: system || 'You are a helpful assistant for Vagus Planner.',
      messages: [{ role: 'user', content: prompt }],
    })
  );

  const block = message.content[0];
  return block?.type === 'text' ? block.text.trim() : '';
}

async function runProviderChat(
  provider: AIProvider,
  opts: VpChatCompletionOptions
): Promise<string> {
  switch (provider) {
    case 'groq':
      return runGroqChat(opts);
    case 'together':
      return runTogetherChat(opts);
    case 'anthropic':
      return runAnthropicChat(opts);
    default:
      throw new Error(`Unsupported VP chat provider: ${provider}`);
  }
}

/**
 * Chat completion with Groq 429 retry (layer 1) then tier-based provider fallback (layer 2).
 */
export async function vpChatCompletion(
  opts: VpChatCompletionOptions
): Promise<VpChatCompletionResult> {
  const art9Categories = opts.art9Categories ?? [];
  const groqOnly = requiresGroqOnlyProvider(art9Categories);
  const providers = getVpChatProviderOrder(opts.userTier ?? 'free', art9Categories);
  const triedProviders: AIProvider[] = [];
  const errors: string[] = [];

  if (providers.length === 0) {
    return {
      ok: false,
      error: groqOnly
        ? VP_ART9_GROQ_UNAVAILABLE_MESSAGE
        : 'AI is temporarily unavailable',
      triedProviders: [],
      ...(groqOnly ? { code: 'VP_ART9_GROQ_ONLY_UNAVAILABLE' as const } : {}),
    };
  }

  for (const provider of providers) {
    triedProviders.push(provider);
    try {
      const content = await runProviderChat(provider, opts);
      if (content) {
        if (provider !== 'groq') {
          console.info(
            `VP AI [${opts.label ?? 'vp-chat'}] succeeded via fallback provider: ${provider}`
          );
        }
        return { ok: true, content, provider };
      }
      errors.push(`${provider}: empty response`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${provider}: ${msg}`);
      console.warn(`VP AI [${opts.label ?? 'vp-chat'}] ${provider} failed:`, msg);
    }
  }

  if (groqOnly) {
    return {
      ok: false,
      error: VP_ART9_GROQ_UNAVAILABLE_MESSAGE,
      triedProviders,
      code: 'VP_ART9_GROQ_ONLY_UNAVAILABLE',
    };
  }

  return {
    ok: false,
    error: errors.join('; ') || 'All AI providers failed',
    triedProviders,
  };
}

export async function vpChatCompletionJson(
  system: string,
  userPrompt: string,
  options?: {
    userTier?: string;
    label?: string;
    temperature?: number;
    schemaHint?: string;
    art9Categories?: VpArt9Category[];
  }
): Promise<VpChatCompletionResult> {
  const userContent = options?.schemaHint
    ? `${userPrompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}\nRespond with JSON matching this schema:\n${options.schemaHint}`
    : `${userPrompt}\n\n${GROQ_JSON_ONLY_INSTRUCTION}`;

  return vpChatCompletion({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    userTier: options?.userTier,
    label: options?.label,
    temperature: options?.temperature ?? 0.4,
    jsonMode: true,
    art9Categories: options?.art9Categories,
  });
}

export type VpTranscriptionResult =
  | { ok: true; transcript: string; provider: 'groq' }
  | { ok: false; error: string };

/**
 * Audio transcription — Groq Whisper only (with 429 retry). No fallback to other subprocessors:
 * audio cannot be pre-classified for Art.9 sensitivity before transcription.
 */
export async function vpTranscribeAudio(
  file: File,
  options?: { language?: string; label?: string }
): Promise<VpTranscriptionResult> {
  const label = options?.label ?? 'vp-transcribe';
  const groq = getGroqClient();

  if (!groq) {
    return { ok: false, error: VP_TRANSCRIPTION_UNAVAILABLE_MESSAGE };
  }

  try {
    const transcription = await withGroqCall(
      () =>
        groq.audio.transcriptions.create({
          file,
          model: GROQ_WHISPER_MODEL,
          language: options?.language,
          response_format: 'json',
          temperature: 0,
        }),
      { label: `${label}/groq` }
    );
    const text = extractTranscriptText(transcription);
    if (text) return { ok: true, transcript: text, provider: 'groq' };
    console.warn(`VP AI [${label}] Groq transcription returned empty text`);
  } catch (error) {
    console.warn(
      `VP AI [${label}] Groq transcription failed:`,
      error instanceof Error ? error.message : String(error)
    );
  }

  return { ok: false, error: VP_TRANSCRIPTION_UNAVAILABLE_MESSAGE };
}

function extractTranscriptText(transcription: unknown): string {
  if (typeof transcription === 'string') return transcription.trim();
  if (
    typeof transcription === 'object' &&
    transcription &&
    'text' in transcription &&
    typeof (transcription as { text?: unknown }).text === 'string'
  ) {
    return (transcription as { text: string }).text.trim();
  }
  return '';
}

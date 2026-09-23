/**
 * Provider runners for cloud HTML generation (selected model from generation-models).
 */
import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { HTML_CODE_SYSTEM_PROMPT } from '@/lib/html-code-system-prompt';
import {
  anthropicAllowsSamplingParams,
  openAIAllowsCustomTemperature,
  type GenerationModel,
  type GenerationProvider,
} from '@/lib/generation-models';
import { GROQ_CODE_MODEL, getGroqClient } from '@/lib/groq-client';
import { buildContinuationMessages } from '@/lib/generation-completeness';

export type StreamGenResult =
  | { ok: true; code: string; streamed: boolean; stopReason?: string | null }
  | { ok: false; error: string };

const CODE_MAX_TOKENS = 8192;

/** DeepSeek chat/flash documents max output at 8k; keep primary gen at that ceiling. */
export const GENERATION_CODE_MAX_TOKENS = CODE_MAX_TOKENS;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Newer OpenAI chat models reject `max_tokens` and require `max_completion_tokens`
 * (GPT-5.x Terra/Sol, GPT-6 Astra, o-series, etc.). DeepSeek/Groq still use max_tokens.
 */
export function openAIUsesMaxCompletionTokens(apiModelId: string): boolean {
  return !openAIAllowsCustomTemperature(apiModelId);
}

function getDeepSeekClient(apiKey?: string | null): OpenAI | null {
  const key = apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: 'https://api.deepseek.com' });
}

function getOpenAIClient(apiKey?: string | null): OpenAI | null {
  const key = apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function getGeminiApiKey(apiKey?: string | null): string | null {
  return (
    apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    null
  );
}

export async function streamOpenAICompatible(
  prompt: string,
  options: {
    client: OpenAI;
    model: string;
    onDelta: (text: string) => void;
    maxTokens?: number;
    temperature?: number;
    /**
     * DeepSeek thinking is ON by default and streams into `reasoning_content`.
     * For HTML code gen we disable it so tokens go to `content` (otherwise we
     * often finish with empty content → "Model returned empty code").
     */
    deepseekDisableThinking?: boolean;
    /** Use max_completion_tokens instead of max_tokens (newer OpenAI models). */
    useMaxCompletionTokens?: boolean;
    /**
     * Full chat transcript (system + turns). When set, `prompt` is ignored —
     * used for same-model truncation continues.
     */
    messages?: ChatMessage[];
  }
): Promise<StreamGenResult> {
  try {
    const maxTok = options.maxTokens ?? CODE_MAX_TOKENS;
    const useMaxCompletion =
      options.useMaxCompletionTokens ?? openAIUsesMaxCompletionTokens(options.model);
    const allowTemperature = openAIAllowsCustomTemperature(options.model);
    const messages: ChatMessage[] = options.messages?.length
      ? options.messages
      : [
          { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ];
    // DeepSeek-only `thinking` / OpenAI max_completion_tokens are not all on SDK types.
    const stream = (await options.client.chat.completions.create({
      messages,
      model: options.model,
      // GPT-5.x / GPT-6 / o-series: omit temperature (API default 1 only).
      ...(allowTemperature
        ? { temperature: options.temperature ?? 0.7 }
        : {}),
      ...(useMaxCompletion
        ? { max_completion_tokens: maxTok }
        : { max_tokens: maxTok }),
      stream: true,
      ...(options.deepseekDisableThinking
        ? { thinking: { type: 'disabled' } }
        : {}),
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming)) as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>;

    let code = '';
    let finish: string | null = null;
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const delta = choice?.delta as
        | { content?: string | null; reasoning_content?: string | null }
        | undefined;
      // Prefer final answer content; ignore CoT so we never ship reasoning as HTML.
      const text = delta?.content ?? '';
      if (text) {
        code += text;
        options.onDelta(text);
      }
    }
    if (!code.trim()) return { ok: false, error: 'Model returned empty code' };
    return { ok: true, code, streamed: true, stopReason: finish };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'OpenAI-compatible stream failed';
    return { ok: false, error: msg };
  }
}

/**
 * Same-model continuation for DeepSeek / OpenAI when the first pass hits the
 * output ceiling mid-document. Prefer this over a cross-model Groq splice.
 */
export async function streamOpenAICompatibleContinue(
  originalPrompt: string,
  partialCode: string,
  options: {
    client: OpenAI;
    model: string;
    onDelta: (text: string) => void;
    maxTokens?: number;
    deepseekDisableThinking?: boolean;
    useMaxCompletionTokens?: boolean;
  }
): Promise<StreamGenResult> {
  const turns = buildContinuationMessages(originalPrompt, partialCode);
  return streamOpenAICompatible(originalPrompt, {
    ...options,
    messages: [
      { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
      ...turns,
    ],
  });
}

export async function streamWithAnthropicModel(
  prompt: string,
  apiKey: string,
  apiModelId: string,
  onDelta: (text: string) => void,
  options?: {
    maxTokens?: number;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<StreamGenResult> {
  try {
    const client = new Anthropic({ apiKey });
    const allowSampling = anthropicAllowsSamplingParams(apiModelId);
    const stream = client.messages.stream({
      model: apiModelId,
      max_tokens: options?.maxTokens ?? CODE_MAX_TOKENS,
      ...(allowSampling ? { temperature: 0.7 } : {}),
      system: HTML_CODE_SYSTEM_PROMPT,
      messages: options?.messages ?? [{ role: 'user', content: prompt }],
    });

    let code = '';
    stream.on('text', (text) => {
      if (!text) return;
      code += text;
      onDelta(text);
    });

    const finalMessage = await stream.finalMessage();
    if (!code.trim()) {
      const block = finalMessage.content[0];
      code = block?.type === 'text' ? block.text : '';
      if (code) onDelta(code);
    }
    if (!code.trim()) return { ok: false, error: 'Anthropic returned empty code' };
    return {
      ok: true,
      code,
      streamed: true,
      stopReason: finalMessage.stop_reason ?? null,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Anthropic error';
    return { ok: false, error: msg };
  }
}

export async function streamWithGemini(
  prompt: string,
  apiModelId: string,
  onDelta: (text: string) => void,
  apiKeyOverride?: string | null
): Promise<StreamGenResult> {
  const apiKey = getGeminiApiKey(apiKeyOverride);
  if (!apiKey) return { ok: false, error: 'Gemini API key not configured (GEMINI_API_KEY)' };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModelId}:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: HTML_CODE_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: CODE_MAX_TOKENS,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Gemini HTTP ${res.status}: ${errText.slice(0, 240) || res.statusText}`,
      };
    }
    if (!res.body) return { ok: false, error: 'Gemini returned empty body' };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let code = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
              finishReason?: string;
            }>;
          };
          const text =
            json.candidates?.[0]?.content?.parts
              ?.map((p) => p.text ?? '')
              .join('') ?? '';
          if (text) {
            code += text;
            onDelta(text);
          }
        } catch {
          /* ignore partial SSE JSON */
        }
      }
    }

    if (!code.trim()) return { ok: false, error: 'Gemini returned empty code' };
    return { ok: true, code, streamed: true, stopReason: 'stop' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Gemini stream failed';
    return { ok: false, error: msg };
  }
}

/** Emergency fallback when DeepSeek is unset — same 1-credit baseline cost. */
export async function streamWithGroqFallback(
  prompt: string,
  onDelta: (text: string) => void
): Promise<StreamGenResult> {
  const groq = getGroqClient();
  if (!groq) return { ok: false, error: 'Groq API key not configured' };
  try {
    const stream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: GROQ_CODE_MODEL,
      temperature: 0.7,
      max_tokens: CODE_MAX_TOKENS,
      stream: true,
    });
    let code = '';
    let finish: string | null = null;
    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const text = choice?.delta?.content ?? '';
      if (text) {
        code += text;
        onDelta(text);
      }
    }
    if (!code.trim()) return { ok: false, error: 'Groq returned empty code' };
    return { ok: true, code, streamed: true, stopReason: finish };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Groq stream failed';
    return { ok: false, error: msg };
  }
}

export type ProviderKeyBundle = {
  openaiKey?: string | null;
  anthropicKey?: string | null;
  deepseekKey?: string | null;
  geminiKey?: string | null;
};

export function resolveByocSkip(
  provider: GenerationProvider,
  useOwnKeys: boolean,
  keys: ProviderKeyBundle
): { skipCredits: boolean; apiKey: string | null } {
  if (!useOwnKeys) return { skipCredits: false, apiKey: null };
  if (provider === 'anthropic' && keys.anthropicKey?.trim()) {
    return { skipCredits: true, apiKey: keys.anthropicKey.trim() };
  }
  if (provider === 'openai' && keys.openaiKey?.trim()) {
    return { skipCredits: true, apiKey: keys.openaiKey.trim() };
  }
  // DeepSeek / Gemini BYOC fields are not on profiles yet — always platform-billed.
  return { skipCredits: false, apiKey: null };
}

export async function streamSelectedGenerationModel(
  prompt: string,
  model: GenerationModel,
  onDelta: (text: string) => void,
  options?: {
    useOwnKeys?: boolean;
    keys?: ProviderKeyBundle;
  }
): Promise<StreamGenResult> {
  const keys = options?.keys ?? {};
  const byoc = resolveByocSkip(model.provider, !!options?.useOwnKeys, keys);
  // Prefer matching BYOC key when present; else platform env.
  const preferKey = byoc.apiKey;

  if (model.provider === 'deepseek') {
    const client = getDeepSeekClient(preferKey);
    if (!client) {
      // Platform DeepSeek missing — fall back to Groq for the default 1-credit path only.
      if (model.creditCost === 1) {
        return streamWithGroqFallback(prompt, onDelta);
      }
      return { ok: false, error: 'DeepSeek API key not configured (DEEPSEEK_API_KEY)' };
    }
    const result = await streamOpenAICompatible(prompt, {
      client,
      model: model.apiModelId,
      onDelta,
      deepseekDisableThinking: true,
    });
    // Empty content after a successful stream is a known DeepSeek thinking/budget footgun.
    // For the default 1-credit path, fall back to Groq rather than fail the builder.
    if (!result.ok && result.error === 'Model returned empty code' && model.creditCost === 1) {
      console.warn('[generation] DeepSeek returned empty code — falling back to Groq');
      return streamWithGroqFallback(prompt, onDelta);
    }
    return result;
  }

  if (model.provider === 'openai') {
    const client = getOpenAIClient(preferKey);
    if (!client) return { ok: false, error: 'OpenAI API key not configured (OPENAI_API_KEY)' };
    return streamOpenAICompatible(prompt, {
      client,
      model: model.apiModelId,
      onDelta,
      useMaxCompletionTokens: true,
    });
  }

  if (model.provider === 'anthropic') {
    const key = preferKey || process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) return { ok: false, error: 'Anthropic API key not configured' };
    return streamWithAnthropicModel(prompt, key, model.apiModelId, onDelta);
  }

  if (model.provider === 'google') {
    return streamWithGemini(prompt, model.apiModelId, onDelta, preferKey);
  }

  return { ok: false, error: `Unsupported provider: ${model.provider}` };
}

/**
 * Truncation continue on the same selected model when possible.
 * Falls back to Groq for Google / missing DeepSeek keys (emergency path).
 */
export async function continueSelectedGenerationModel(
  originalPrompt: string,
  partialCode: string,
  model: GenerationModel,
  onDelta: (text: string) => void,
  options?: {
    useOwnKeys?: boolean;
    keys?: ProviderKeyBundle;
    maxTokens?: number;
  }
): Promise<StreamGenResult> {
  const keys = options?.keys ?? {};
  const byoc = resolveByocSkip(model.provider, !!options?.useOwnKeys, keys);
  const preferKey = byoc.apiKey;
  const maxTokens = options?.maxTokens ?? CODE_MAX_TOKENS;

  if (model.provider === 'anthropic') {
    const key = preferKey || process.env.ANTHROPIC_API_KEY?.trim();
    if (!key) return { ok: false, error: 'Anthropic API key not configured' };
    return streamWithAnthropicModel(originalPrompt, key, model.apiModelId, onDelta, {
      maxTokens,
      messages: buildContinuationMessages(originalPrompt, partialCode),
    });
  }

  if (model.provider === 'deepseek') {
    const client = getDeepSeekClient(preferKey);
    if (!client) {
      return streamWithGroqFallback(
        `${originalPrompt}\n\nContinue the HTML from where it left off. Output ONLY the continuation (no DOCTYPE replay).\n\nPartial so far:\n${partialCode.slice(-6000)}`,
        onDelta
      );
    }
    const cont = await streamOpenAICompatibleContinue(originalPrompt, partialCode, {
      client,
      model: model.apiModelId,
      onDelta,
      maxTokens,
      deepseekDisableThinking: true,
    });
    if (!cont.ok && model.creditCost === 1) {
      console.warn('[generation] DeepSeek continue failed — falling back to Groq');
      return streamWithGroqFallback(
        `${originalPrompt}\n\nContinue the HTML from where it left off. Output ONLY the continuation (no DOCTYPE replay).\n\nPartial so far:\n${partialCode.slice(-6000)}`,
        onDelta
      );
    }
    return cont;
  }

  if (model.provider === 'openai') {
    const client = getOpenAIClient(preferKey);
    if (!client) return { ok: false, error: 'OpenAI API key not configured (OPENAI_API_KEY)' };
    return streamOpenAICompatibleContinue(originalPrompt, partialCode, {
      client,
      model: model.apiModelId,
      onDelta,
      maxTokens,
      useMaxCompletionTokens: true,
    });
  }

  // Gemini (and anything else): Groq emergency continue with more partial context.
  return streamWithGroqFallback(
    `${originalPrompt}\n\nContinue the HTML from where it left off. Output ONLY the continuation (no DOCTYPE replay). Close any open <script>/<style> and finish with </html>.\n\nPartial so far:\n${partialCode.slice(-6000)}`,
    onDelta
  );
}


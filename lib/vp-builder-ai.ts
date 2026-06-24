import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import {
  getProviderOrder,
  type AIProvider,
  type AIResponse,
  type UserKeyOptions,
} from '@/lib/ai-providers';
import { getGroqClient } from '@/lib/groq-client';
import { VP_REACT_SYSTEM_PROMPT } from '@/lib/vagus-planner-builder';

async function groqWithSystem(system: string, user: string): Promise<AIResponse> {
  const groq = getGroqClient();
  if (!groq) {
    return { success: false, code: '', provider: 'groq', error: 'Groq API key not configured' };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 8192,
    });
    const code = completion.choices[0]?.message?.content || '';
    return { success: !!code.trim(), code, provider: 'groq' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Groq error';
    return { success: false, code: '', provider: 'groq', error: msg };
  }
}

async function anthropicWithSystem(
  system: string,
  user: string,
  apiKey: string
): Promise<AIResponse> {
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 8192,
      temperature: 0.4,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const code = message.content[0].type === 'text' ? message.content[0].text : '';
    return { success: !!code.trim(), code, provider: 'anthropic' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Anthropic error';
    return { success: false, code: '', provider: 'anthropic', error: msg };
  }
}

async function togetherWithSystem(system: string, user: string): Promise<AIResponse> {
  if (!process.env.TOGETHER_API_KEY) {
    return { success: false, code: '', provider: 'together', error: 'Together AI not configured' };
  }

  try {
    const OpenAI = require('openai');
    const client = new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: 'https://api.together.xyz/v1',
    });
    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      temperature: 0.4,
      max_tokens: 8192,
    });
    const code = completion.choices[0]?.message?.content || '';
    return { success: !!code.trim(), code, provider: 'together' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Together error';
    return { success: false, code: '', provider: 'together', error: msg };
  }
}

async function localWithSystem(system: string, user: string): Promise<AIResponse> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:7b',
        prompt: `${system}\n\n${user}`,
        stream: false,
        max_tokens: 8192,
      }),
    });
    if (!response.ok) throw new Error('Ollama not running');
    const data = await response.json();
    const code = typeof data.response === 'string' ? data.response : '';
    return { success: !!code.trim(), code, provider: 'local' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Local Ollama error';
    return { success: false, code: '', provider: 'local', error: msg };
  }
}

async function runProvider(
  provider: AIProvider,
  system: string,
  user: string,
  keys: UserKeyOptions
): Promise<AIResponse> {
  switch (provider) {
    case 'anthropic':
      if (keys.useOwnKeys && keys.anthropicKey?.trim()) {
        return anthropicWithSystem(system, user, keys.anthropicKey.trim());
      }
      if (process.env.ANTHROPIC_API_KEY?.trim()) {
        return anthropicWithSystem(system, user, process.env.ANTHROPIC_API_KEY.trim());
      }
      return { success: false, code: '', provider: 'anthropic', error: 'Anthropic not configured' };
    case 'groq':
      return groqWithSystem(system, user);
    case 'together':
      return togetherWithSystem(system, user);
    case 'local':
      return localWithSystem(system, user);
    default:
      return { success: false, code: '', provider: 'groq', error: 'Unsupported provider' };
  }
}

export async function generateVpSourceEdit(
  userPrompt: string,
  userTier = 'free',
  userKeys?: UserKeyOptions,
  systemPrompt = VP_REACT_SYSTEM_PROMPT
): Promise<AIResponse> {
  const keys = userKeys ?? {};

  if (keys.useOwnKeys && keys.anthropicKey?.trim()) {
    const own = await anthropicWithSystem(systemPrompt, userPrompt, keys.anthropicKey.trim());
    if (own.success) return own;
  }

  for (const provider of getProviderOrder(userTier)) {
    const result = await runProvider(provider, systemPrompt, userPrompt, keys);
    if (result.success) return result;
  }

  return {
    success: false,
    code: '',
    provider: 'groq',
    error: 'All AI providers failed. Please try again later.',
  };
}

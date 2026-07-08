import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { addCloudCredits, deductCloudCredit } from '@/lib/credits';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import { getGroqClient } from '@/lib/groq-client';
import { streamBuildNarration } from '@/lib/generate-narration';
import { canUseOwnApiKeys } from '@/lib/tier-config';
import { getProviderOrder } from '@/lib/ai-providers';
import Anthropic from '@anthropic-ai/sdk';

const CODE_SYSTEM_PROMPT = `You are an expert web developer. Generate ONLY complete HTML/CSS/JavaScript code. 
No explanations. No markdown. Start directly with <!DOCTYPE html>. 
Make it responsive, modern, and visually appealing. Use Tailwind CSS when appropriate.
For Tailwind, use <script src="https://cdn.tailwindcss.com"></script> — never use cdn.jsdelivr.net tailwind.min.js.
Do not include Font Awesome or placeholder kit URLs. Use inline SVG or Unicode symbols for icons instead.
If you use CSS variables like --color-border or --color-bg, define them on :root with valid color values.`;

async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, use_own_api_keys, openai_api_key, anthropic_api_key')
    .eq('id', userId)
    .single();
  return data;
}

function sseLine(encoder: TextEncoder, payload: Record<string, unknown> | string): Uint8Array {
  const body =
    typeof payload === 'string' ? payload : JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
}

async function generateWithAnthropicKey(prompt: string, apiKey: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      temperature: 0.7,
      system: CODE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });
    const code = message.content[0]?.type === 'text' ? message.content[0].text : '';
    if (!code.trim()) return { ok: false, error: 'Anthropic returned empty code' };
    return { ok: true, code };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Anthropic error';
    return { ok: false, error: msg };
  }
}

async function generateWithTogether(prompt: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  try {
    const apiKey = process.env.TOGETHER_API_KEY?.trim();
    if (!apiKey) return { ok: false, error: 'Together AI not configured' };
    const OpenAI = require('openai');
    const together = new OpenAI({ apiKey, baseURL: 'https://api.together.xyz/v1' });
    const completion = await together.chat.completions.create({
      messages: [
        { role: 'system', content: CODE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      temperature: 0.7,
      max_tokens: 4096,
    });
    const code = completion.choices?.[0]?.message?.content || '';
    if (!code.trim()) return { ok: false, error: 'Together returned empty code' };
    return { ok: true, code };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Together error';
    return { ok: false, error: msg };
  }
}

async function generateWithOpenAIKey(prompt: string, apiKey: string): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      messages: [
        { role: 'system', content: CODE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      max_tokens: 4096,
    });
    const code = completion.choices?.[0]?.message?.content || '';
    if (!code.trim()) return { ok: false, error: 'OpenAI returned empty code' };
    return { ok: true, code };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'OpenAI error';
    return { ok: false, error: msg };
  }
}

/** SSE: live narration (plain English) then code tokens for preview */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const profile = await getUserProfile(guard.user.id);
  const tier = profile?.subscription_tier || 'free';
  const status = profile?.subscription_status || 'inactive';

  if (!canSpendCloudCredits(tier, status)) {
    return new Response(JSON.stringify({ error: outOfCreditsMessage(tier, status) }), {
      status: 403,
    });
  }

  const byocAllowed = canUseOwnApiKeys(tier);
  const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
  const hasUserKeys = !!(profile?.openai_api_key || profile?.anthropic_api_key);
  const skipCredits = useOwnKeys && hasUserKeys;

  const didDeduct = !skipCredits;
  if (!skipCredits) {
    const creditResult = await deductCloudCredit(guard.user.id);
    if (!creditResult.ok) {
      return new Response(JSON.stringify({ error: creditResult.error || 'Insufficient credits' }), {
        status: 402,
      });
    }
  }

  const groq = getGroqClient();
  // Note: Groq is optional now; we can fall back to other providers.

  const encoder = new TextEncoder();

  const body = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown> | string) => {
        controller.enqueue(sseLine(encoder, payload));
      };

      try {
        const allowDebugFail = process.env.NODE_ENV !== 'production';
        const debugFailProvider = allowDebugFail
          ? request.headers.get('x-nisk-debug-fail-provider')
          : null;
        const debugFailStage = allowDebugFail
          ? request.headers.get('x-nisk-debug-fail-stage')
          : null;

        try {
          if (debugFailStage === 'narration') {
            throw new Error('Debug forced narration failure');
          }
          await streamBuildNarration(
            prompt,
            'html',
            (accumulated) => {
              send({ kind: 'narration', text: accumulated });
            }
          );
        } catch {
          const fallback =
            'Understanding your request…\nPlanning the page structure…\nPreparing layout and styles…';
          send({ kind: 'narration', text: fallback });
        }

        send({ kind: 'status', text: 'Generating your app — preview will update when ready…' });

        const providerOrder = getProviderOrder(tier);
        let finalCode = '';
        let lastError = '';
        let streamedCode = false;

        // If the user opted into BYOC, try their keys first (non-streaming).
        if (useOwnKeys && hasUserKeys) {
          send({ kind: 'status', text: 'Using your own API keys…' });
          if (profile?.anthropic_api_key?.trim()) {
            const result = await generateWithAnthropicKey(prompt, profile.anthropic_api_key.trim());
            if (result.ok) {
              finalCode = result.code;
            } else {
              lastError = result.error;
            }
          }
          if (!finalCode && profile?.openai_api_key?.trim()) {
            const result = await generateWithOpenAIKey(prompt, profile.openai_api_key.trim());
            if (result.ok) {
              finalCode = result.code;
            } else {
              lastError = result.error;
            }
          }
        }

        for (const provider of providerOrder) {
          if (finalCode) break;
          if (debugFailProvider && debugFailProvider === provider) {
            lastError = `Debug forced failure for provider: ${provider}`;
            continue;
          }
          send({ kind: 'status', text: `Trying ${provider}…` });

          if (provider === 'groq') {
            if (!groq) {
              lastError = 'Groq API key not configured';
              continue;
            }
            try {
              const codeStream = await groq.chat.completions.create({
                messages: [
                  { role: 'system', content: CODE_SYSTEM_PROMPT },
                  { role: 'user', content: prompt },
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 4096,
                stream: true,
              });

              for await (const chunk of codeStream) {
                const text = chunk.choices[0]?.delta?.content ?? '';
                if (text) {
                  finalCode += text;
                  streamedCode = true;
                  send({ kind: 'code', text });
                  if (debugFailStage === 'mid-stream' && finalCode.length >= 800) {
                    throw new Error('Debug forced mid-stream failure');
                  }
                }
              }

              if (finalCode.trim()) break;
              lastError = 'Groq returned empty code';
              finalCode = '';
              continue;
            } catch (err) {
              lastError = err instanceof Error ? err.message : 'Groq stream failed';
              finalCode = '';
              streamedCode = false;
              continue;
            }
          }

          if (provider === 'anthropic') {
            const key = process.env.ANTHROPIC_API_KEY?.trim();
            if (!key) {
              lastError = 'Anthropic API key not configured';
              continue;
            }
            const result = await generateWithAnthropicKey(prompt, key);
            if (result.ok) finalCode = result.code;
            else lastError = result.error;
            continue;
          }

          if (provider === 'together') {
            const result = await generateWithTogether(prompt);
            if (result.ok) finalCode = result.code;
            else lastError = result.error;
            continue;
          }

          if (provider === 'local') {
            // Local Ollama is intentionally not attempted in this cloud route.
            lastError = 'Local generation not available in cloud stream route';
            continue;
          }
        }

        // Optional last resort: platform OpenAI key (not included in tier provider list today).
        if (!finalCode && process.env.OPENAI_API_KEY?.trim()) {
          if (!(debugFailProvider && debugFailProvider === 'openai')) {
            send({ kind: 'status', text: 'Trying openai…' });
            const result = await generateWithOpenAIKey(prompt, process.env.OPENAI_API_KEY.trim());
            if (result.ok) finalCode = result.code;
            else lastError = result.error;
          } else {
            lastError = 'Debug forced failure for provider: openai';
          }
        }

        if (!finalCode.trim()) {
          throw new Error(lastError || 'All AI providers failed');
        }

        // If we fell back to a non-streaming provider, send the full result as one SSE payload.
        // (Groq success path already emitted streamed chunks into the client.)
        if (!streamedCode) {
          send({ kind: 'code', text: finalCode });
        }

        send('[DONE]');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        if (didDeduct) {
          await addCloudCredits(guard.user!.id, 1).catch(() => {});
        }
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

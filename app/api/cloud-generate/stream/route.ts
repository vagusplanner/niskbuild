import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import {
  deductCloudCreditForContext,
  refundCloudCreditsForContext,
  resolveCreditChargeContext,
} from '@/lib/org-credits';

import { getGroqClient } from '@/lib/groq-client';
import { streamBuildNarration } from '@/lib/generate-narration';
import { derivePromptNarrationFallback } from '@/lib/narration-shared';
import { HTML_CODE_SYSTEM_PROMPT } from '@/lib/html-code-system-prompt';
import { logBuildPerformance } from '@/lib/build-performance-server';
import { canUseOwnApiKeys } from '@/lib/tier-config';
import { getProviderOrder } from '@/lib/ai-providers';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import Anthropic from '@anthropic-ai/sdk';

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
      system: HTML_CODE_SYSTEM_PROMPT,
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
        { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
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
        { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
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

/** SSE: live narration and code tokens in parallel for preview */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { prompt, projectId, narrationContext } = await request.json();
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const chargeResolved = await resolveCreditChargeContext({
    actingUserId: guard.user.id,
    projectId: typeof projectId === 'string' ? projectId : null,
  });
  if (!chargeResolved.ok) {
    return new Response(JSON.stringify({ error: chargeResolved.error }), {
      status: chargeResolved.status,
    });
  }
  const chargeContext = chargeResolved.context;

  const profile = await getUserProfile(guard.user.id);
  const tier = profile?.subscription_tier || 'free';
  const status = profile?.subscription_status || 'inactive';

  // Personal projects: gate on acting user. Org projects: payer checked on deduct
  // (members may be on Free while the org pool is Agency+).
  if (!chargeContext.isOrgPool && !canSpendCloudCredits(tier, status)) {
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
    const creditResult = await deductCloudCreditForContext(chargeContext);
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

        const streamStartedAt = Date.now();
        let firstCodeAt: number | null = null;
        const narrationExtra =
          typeof narrationContext === 'string' ? narrationContext : undefined;

        const markFirstCode = () => {
          if (firstCodeAt === null) firstCodeAt = Date.now();
        };

        // Narration and code generation run concurrently — SSE `kind` keeps streams separate on the client.
        const narrationPromise = (async () => {
          try {
            if (debugFailStage === 'narration') {
              throw new Error('Debug forced narration failure');
            }
            await streamBuildNarration(
              prompt,
              'html',
              (accumulated) => {
                send({ kind: 'narration', text: accumulated });
              },
              narrationExtra
            );
          } catch {
            const fallback = derivePromptNarrationFallback(prompt, narrationExtra);
            send({ kind: 'narration', text: fallback });
          }
        })();

        const codePromise = (async (): Promise<{
          finalCode: string;
          streamedCode: boolean;
          lastError: string;
        }> => {
          send({ kind: 'status', text: 'Generating your app — preview will update when ready…' });

          const providerOrder = getProviderOrder(tier);
          let finalCode = '';
          let lastError = '';
          let streamedCode = false;

          if (useOwnKeys && hasUserKeys) {
            send({ kind: 'status', text: 'Using your own API keys…' });
            if (profile?.anthropic_api_key?.trim()) {
              const result = await generateWithAnthropicKey(prompt, profile.anthropic_api_key.trim());
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
              } else {
                lastError = result.error;
              }
            }
            if (!finalCode && profile?.openai_api_key?.trim()) {
              const result = await generateWithOpenAIKey(prompt, profile.openai_api_key.trim());
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
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
                    { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
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
                    markFirstCode();
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
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
              } else lastError = result.error;
              continue;
            }

            if (provider === 'together') {
              const result = await generateWithTogether(prompt);
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
              } else lastError = result.error;
              continue;
            }

            if (provider === 'local') {
              lastError = 'Local generation not available in cloud stream route';
              continue;
            }
          }

          if (!finalCode && process.env.OPENAI_API_KEY?.trim()) {
            if (!(debugFailProvider && debugFailProvider === 'openai')) {
              send({ kind: 'status', text: 'Trying openai…' });
              const result = await generateWithOpenAIKey(prompt, process.env.OPENAI_API_KEY.trim());
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
              } else lastError = result.error;
            } else {
              lastError = 'Debug forced failure for provider: openai';
            }
          }

          return { finalCode, streamedCode, lastError };
        })();

        const [codeResult] = await Promise.all([codePromise, narrationPromise]);
        const { finalCode, streamedCode, lastError } = codeResult;

        if (!finalCode.trim()) {
          throw new Error(lastError || 'All AI providers failed');
        }

        if (!streamedCode) {
          send({ kind: 'code', text: finalCode });
        }

        const durationMs = Date.now() - streamStartedAt;
        logBuildPerformance(guard.user!.id, {
          source: 'cloud_stream_server',
          ttfcMs: firstCodeAt !== null ? firstCodeAt - streamStartedAt : null,
          durationMs,
          success: true,
          codeChars: finalCode.length,
        });

        void recordUsageEvent({
          eventType: 'build',
          userId: guard.user!.id,
          prompt,
          projectId: typeof projectId === 'string' ? projectId : null,
          clientIp: clientIpFromHeaders(request.headers),
        });
        void recordPromptCategoryStat({
          userId: guard.user!.id,
          prompt,
        });
        void touchLastBuildAt(guard.user!.id);

        send('[DONE]');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        if (didDeduct) {
          await refundCloudCreditsForContext(chargeContext, 1).catch(() => {});
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

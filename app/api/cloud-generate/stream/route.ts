import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import {
  deductCloudCreditForContext,
  refundCloudCreditsForContext,
  resolveCreditChargeContext,
  type CreditChargeContext,
} from '@/lib/org-credits';

import { getGroqClient } from '@/lib/groq-client';
import { streamBuildNarration } from '@/lib/generate-narration';
import { derivePromptNarrationFallback } from '@/lib/narration-shared';
import { HTML_CODE_SYSTEM_PROMPT } from '@/lib/html-code-system-prompt';
import { logBuildPerformance } from '@/lib/build-performance-server';
import { canUseOwnApiKeys } from '@/lib/tier-config';
import { getStreamProviderOrder } from '@/lib/ai-providers';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import {
  assessGenerationCompleteness,
  buildContinuationMessages,
  truncationUserMessage,
} from '@/lib/generation-completeness';
import Anthropic from '@anthropic-ai/sdk';

const CODE_MAX_TOKENS = 8192;
/** Extra tokens for a single auto-continue when output was truncated. */
const CONTINUE_MAX_TOKENS = 4096;
const MAX_CONTINUE_ATTEMPTS = 1;

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

type StreamGenResult =
  | { ok: true; code: string; streamed: boolean; stopReason?: string | null }
  | { ok: false; error: string };

async function streamWithAnthropicKey(
  prompt: string,
  apiKey: string,
  onDelta: (text: string) => void,
  options?: {
    maxTokens?: number;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Promise<StreamGenResult> {
  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: 'claude-3-sonnet-20240229',
      max_tokens: options?.maxTokens ?? CODE_MAX_TOKENS,
      temperature: 0.7,
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

async function streamContinueWithGroq(
  originalPrompt: string,
  partialCode: string,
  onDelta: (text: string) => void
): Promise<StreamGenResult> {
  try {
    const groq = getGroqClient();
    if (!groq) return { ok: false, error: 'Groq API key not configured' };

    const codeStream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: HTML_CODE_SYSTEM_PROMPT },
        ...buildContinuationMessages(originalPrompt, partialCode),
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: CONTINUE_MAX_TOKENS,
      stream: true,
    });

    let code = '';
    let finish: string | null = null;
    for await (const chunk of codeStream) {
      const choice = chunk.choices[0];
      if (choice?.finish_reason) finish = choice.finish_reason;
      const text = choice?.delta?.content ?? '';
      if (text) {
        code += text;
        onDelta(text);
      }
    }
    if (!code.trim()) return { ok: false, error: 'Groq continue returned empty code' };
    return { ok: true, code, streamed: true, stopReason: finish };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Groq continue failed';
    return { ok: false, error: msg };
  }
}

async function generateWithTogether(prompt: string): Promise<StreamGenResult> {
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
      max_tokens: CODE_MAX_TOKENS,
    });
    const code = completion.choices?.[0]?.message?.content || '';
    const finishReason = completion.choices?.[0]?.finish_reason ?? null;
    if (!code.trim()) return { ok: false, error: 'Together returned empty code' };
    return { ok: true, code, streamed: false, stopReason: finishReason };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Together error';
    return { ok: false, error: msg };
  }
}

async function generateWithOpenAIKey(prompt: string, apiKey: string): Promise<StreamGenResult> {
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
      max_tokens: CODE_MAX_TOKENS,
    });
    const code = completion.choices?.[0]?.message?.content || '';
    const finishReason = completion.choices?.[0]?.finish_reason ?? null;
    if (!code.trim()) return { ok: false, error: 'OpenAI returned empty code' };
    return { ok: true, code, streamed: false, stopReason: finishReason };
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
  const chargeContext: CreditChargeContext = chargeResolved.context;

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

  const groq = getGroqClient();
  const encoder = new TextEncoder();
  const userId = guard.user.id;

  // Open SSE immediately — credit deduct happens inside after the first status event
  // so the client sees live progress instead of waiting on billing I/O.
  const body = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown> | string) => {
        controller.enqueue(sseLine(encoder, payload));
      };

      let didDeduct = false;

      try {
        send({ kind: 'status', text: 'Starting generation…' });

        if (!skipCredits) {
          send({ kind: 'status', text: 'Reserving a cloud credit…' });
          const creditResult = await deductCloudCreditForContext(chargeContext);
          if (!creditResult.ok) {
            send({ error: creditResult.error || 'Insufficient credits' });
            return;
          }
          didDeduct = true;
        }

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
          stopReason: string | null;
        }> => {
          send({ kind: 'status', text: 'Generating your app — preview updates as code streams…' });

          // Streaming-first for ALL tiers (Agency+ included) — Groq before Anthropic.
          const providerOrder = getStreamProviderOrder(tier);
          let finalCode = '';
          let lastError = '';
          let streamedCode = false;
          let stopReason: string | null = null;

          // BYOK: prefer streaming Anthropic when available, else OpenAI (batch).
          if (useOwnKeys && hasUserKeys) {
            send({ kind: 'status', text: 'Using your own API keys…' });
            if (profile?.anthropic_api_key?.trim()) {
              const result = await streamWithAnthropicKey(
                prompt,
                profile.anthropic_api_key.trim(),
                (text) => {
                  markFirstCode();
                  streamedCode = true;
                  send({ kind: 'code', text });
                }
              );
              if (result.ok) {
                finalCode = result.code;
                streamedCode = result.streamed;
                stopReason = result.stopReason ?? null;
              } else {
                lastError = result.error;
              }
            }
            if (!finalCode && profile?.openai_api_key?.trim()) {
              const result = await generateWithOpenAIKey(prompt, profile.openai_api_key.trim());
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
                stopReason = result.stopReason ?? null;
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
                  max_tokens: CODE_MAX_TOKENS,
                  stream: true,
                });

                let groqFinish: string | null = null;
                for await (const chunk of codeStream) {
                  const choice = chunk.choices[0];
                  if (choice?.finish_reason) groqFinish = choice.finish_reason;
                  const text = choice?.delta?.content ?? '';
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

                if (finalCode.trim()) {
                  stopReason = groqFinish;
                  break;
                }
                lastError = 'Groq returned empty code';
                finalCode = '';
                streamedCode = false;
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
              const result = await streamWithAnthropicKey(prompt, key, (text) => {
                markFirstCode();
                streamedCode = true;
                send({ kind: 'code', text });
              });
              if (result.ok) {
                finalCode = result.code;
                streamedCode = result.streamed;
                stopReason = result.stopReason ?? null;
              } else {
                lastError = result.error;
              }
              continue;
            }

            if (provider === 'together') {
              const result = await generateWithTogether(prompt);
              if (result.ok) {
                finalCode = result.code;
                markFirstCode();
                stopReason = result.stopReason ?? null;
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
                stopReason = result.stopReason ?? null;
              } else lastError = result.error;
            } else {
              lastError = 'Debug forced failure for provider: openai';
            }
          }

          return { finalCode, streamedCode, lastError, stopReason };
        })();

        const [codeResult] = await Promise.all([codePromise, narrationPromise]);
        let { finalCode, streamedCode, lastError, stopReason } = codeResult;

        if (!finalCode.trim()) {
          throw new Error(lastError || 'All AI providers failed');
        }

        if (!streamedCode) {
          send({ kind: 'code', text: finalCode });
        }

        // WP3: detect truncated output; try one auto-continue, else surface clearly (no silent success).
        let completeness = assessGenerationCompleteness(finalCode, stopReason);
        for (
          let attempt = 0;
          !completeness.complete && attempt < MAX_CONTINUE_ATTEMPTS;
          attempt++
        ) {
          send({
            kind: 'status',
            text: 'Output was cut off — continuing generation…',
          });

          const onContinueDelta = (text: string) => {
            markFirstCode();
            streamedCode = true;
            finalCode += text;
            send({ kind: 'code', text });
          };

          let continued = false;

          // Prefer Groq for fast continuation streaming.
          const groqContinue = await streamContinueWithGroq(
            prompt,
            finalCode,
            onContinueDelta
          );
          if (groqContinue.ok) {
            stopReason = groqContinue.stopReason ?? null;
            continued = true;
          } else {
            const anthropicKey =
              (useOwnKeys && profile?.anthropic_api_key?.trim()) ||
              process.env.ANTHROPIC_API_KEY?.trim() ||
              '';
            if (anthropicKey) {
              const anthropicContinue = await streamWithAnthropicKey(
                prompt,
                anthropicKey,
                onContinueDelta,
                {
                  maxTokens: CONTINUE_MAX_TOKENS,
                  messages: buildContinuationMessages(prompt, finalCode),
                }
              );
              if (anthropicContinue.ok) {
                stopReason = anthropicContinue.stopReason ?? null;
                continued = true;
              }
            }
          }

          if (!continued) break;
          completeness = assessGenerationCompleteness(finalCode, stopReason);
        }

        if (!completeness.complete) {
          const durationMs = Date.now() - streamStartedAt;
          logBuildPerformance(userId, {
            source: 'cloud_stream_server',
            ttfcMs: firstCodeAt !== null ? firstCodeAt - streamStartedAt : null,
            durationMs,
            success: false,
            codeChars: finalCode.length,
          });
          throw new Error(truncationUserMessage(completeness.reason));
        }

        const durationMs = Date.now() - streamStartedAt;
        logBuildPerformance(userId, {
          source: 'cloud_stream_server',
          ttfcMs: firstCodeAt !== null ? firstCodeAt - streamStartedAt : null,
          durationMs,
          success: true,
          codeChars: finalCode.length,
        });

        void recordUsageEvent({
          eventType: 'build',
          userId,
          prompt,
          projectId: typeof projectId === 'string' ? projectId : null,
          clientIp: clientIpFromHeaders(request.headers),
        });
        void recordPromptCategoryStat({
          userId,
          prompt,
        });
        void touchLastBuildAt(userId);

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

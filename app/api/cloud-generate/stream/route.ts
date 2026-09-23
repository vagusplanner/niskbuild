import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import {
  deductCloudCreditsForContext,
  refundCloudCreditsForContext,
  resolveCreditChargeContext,
  type CreditChargeContext,
} from '@/lib/org-credits';

import { streamBuildNarration } from '@/lib/generate-narration';
import { derivePromptNarrationFallback } from '@/lib/narration-shared';
import { logBuildPerformance } from '@/lib/build-performance-server';
import { canUseOwnApiKeys, resolveProductGatingBypass } from '@/lib/tier-access-server';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import {
  assessGenerationCompleteness,
  buildContinuationMessages,
  truncationUserMessage,
} from '@/lib/generation-completeness';
import { countProgressMarkers } from '@/lib/generation-progress';
import {
  canSelectGenerationModel,
  getGenerationModel,
  isGenerationModelId,
} from '@/lib/generation-models';
import {
  resolveByocSkip,
  streamSelectedGenerationModel,
  streamWithAnthropicModel,
  streamWithGroqFallback,
} from '@/lib/generation-providers';

const CONTINUE_MAX_TOKENS = 4096;
const MAX_CONTINUE_ATTEMPTS = 1;

async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, use_own_api_keys, openai_api_key, anthropic_api_key'
    )
    .eq('id', userId)
    .single();
  return data;
}

function sseLine(encoder: TextEncoder, payload: Record<string, unknown> | string): Uint8Array {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return encoder.encode(`data: ${body}\n\n`);
}

/** SSE: live narration and code tokens in parallel for preview */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const bodyJson = await request.json();
  const { prompt, projectId, narrationContext, modelId } = bodyJson as {
    prompt?: string;
    projectId?: string;
    narrationContext?: string;
    modelId?: string;
  };
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
  }

  const selectedModel = getGenerationModel(
    isGenerationModelId(modelId) ? modelId : undefined
  );

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
  const ownerBypass = await resolveProductGatingBypass(guard.user.id);
  const tier = profile?.subscription_tier || 'free';
  const status = profile?.subscription_status || 'inactive';

  if (!chargeContext.isOrgPool && !canSpendCloudCredits(tier, status, ownerBypass)) {
    return new Response(JSON.stringify({ error: outOfCreditsMessage(tier, status, ownerBypass) }), {
      status: 403,
    });
  }

  if (!canSelectGenerationModel(selectedModel, tier) && !ownerBypass) {
    return new Response(
      JSON.stringify({
        error: `${selectedModel.label} requires Pro Worker or above. Upgrade to unlock premium models.`,
        upgrade: true,
      }),
      { status: 403 }
    );
  }

  const byocAllowed = canUseOwnApiKeys(tier, ownerBypass);
  const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
  const keyBundle = {
    openaiKey: byocAllowed ? profile?.openai_api_key : null,
    anthropicKey: byocAllowed ? profile?.anthropic_api_key : null,
  };
  const byoc = resolveByocSkip(selectedModel.provider, useOwnKeys, keyBundle);
  // Owner bypass must skip deduction at the route layer — do not rely solely on
  // ALS inside ReadableStream.start() (context can be lost across the stream boundary).
  const skipCredits = byoc.skipCredits || ownerBypass;
  const creditCost = selectedModel.creditCost;

  const encoder = new TextEncoder();
  const userId = guard.user.id;

  const body = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown> | string) => {
        controller.enqueue(sseLine(encoder, payload));
      };

      let didDeduct = false;
      let deductedAmount = 0;

      try {
        send({
          kind: 'status',
          text: `Starting generation with ${selectedModel.label}…`,
        });

        if (!skipCredits) {
          send({
            kind: 'status',
            text:
              creditCost === 1
                ? 'Reserving a cloud credit…'
                : `Reserving ${creditCost} cloud credits…`,
          });
          const creditResult = await deductCloudCreditsForContext(chargeContext, creditCost);
          if (!creditResult.ok) {
            send({ error: creditResult.error || 'Insufficient credits' });
            return;
          }
          didDeduct = true;
          deductedAmount = creditCost;
        } else {
          send({
            kind: 'status',
            text: ownerBypass
              ? 'Platform owner — no credits charged…'
              : 'Using your own API key — no credits charged…',
          });
        }

        const streamStartedAt = Date.now();
        let firstCodeAt: number | null = null;
        const narrationExtra =
          typeof narrationContext === 'string' ? narrationContext : undefined;

        const markFirstCode = () => {
          if (firstCodeAt === null) firstCodeAt = Date.now();
        };

        const narrationPromise = (async () => {
          try {
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

        const codePromise = (async () => {
          send({
            kind: 'status',
            text: `Generating with ${selectedModel.shortLabel} — preview updates as code streams…`,
          });

          let streamedCode = false;
          const result = await streamSelectedGenerationModel(
            prompt,
            selectedModel,
            (text) => {
              markFirstCode();
              streamedCode = true;
              send({ kind: 'code', text });
            },
            { useOwnKeys, keys: keyBundle }
          );

          if (!result.ok) {
            return {
              finalCode: '',
              streamedCode: false,
              lastError: result.error,
              stopReason: null as string | null,
            };
          }

          return {
            finalCode: result.code,
            streamedCode: streamedCode || result.streamed,
            lastError: '',
            stopReason: result.stopReason ?? null,
          };
        })();

        const [codeResult] = await Promise.all([codePromise, narrationPromise]);
        let { finalCode, streamedCode, lastError, stopReason } = codeResult;

        if (!finalCode.trim()) {
          throw new Error(lastError || `${selectedModel.label} generation failed`);
        }

        if (!streamedCode) {
          send({ kind: 'code', text: finalCode });
        }

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

          if (selectedModel.provider === 'anthropic') {
            const key =
              (useOwnKeys && profile?.anthropic_api_key?.trim()) ||
              process.env.ANTHROPIC_API_KEY?.trim() ||
              '';
            if (key) {
              const cont = await streamWithAnthropicModel(
                prompt,
                key,
                selectedModel.apiModelId,
                onContinueDelta,
                {
                  maxTokens: CONTINUE_MAX_TOKENS,
                  messages: buildContinuationMessages(prompt, finalCode),
                }
              );
              if (cont.ok) {
                stopReason = cont.stopReason ?? null;
                continued = true;
              }
            }
          } else {
            // Fast continue via Groq for non-Anthropic truncations
            const groqContinue = await streamWithGroqFallback(
              `${prompt}\n\nContinue the HTML from where it left off. Output ONLY the continuation (no DOCTYPE replay).\n\nPartial so far:\n${finalCode.slice(-4000)}`,
              onContinueDelta
            );
            if (groqContinue.ok) {
              stopReason = groqContinue.stopReason ?? null;
              continued = true;
            }
          }

          if (!continued) break;
          completeness = assessGenerationCompleteness(finalCode, stopReason);
        }

        if (!completeness.complete) {
          const durationMs = Date.now() - streamStartedAt;
          const markerCount = countProgressMarkers(finalCode);
          logBuildPerformance(userId, {
            source: 'cloud_stream_server',
            ttfcMs: firstCodeAt !== null ? firstCodeAt - streamStartedAt : null,
            durationMs,
            success: false,
            codeChars: finalCode.length,
            progressSource: markerCount > 0 ? 'markers' : 'none',
            markerCount,
          });
          throw new Error(truncationUserMessage(completeness.reason));
        }

        const durationMs = Date.now() - streamStartedAt;
        const markerCount = countProgressMarkers(finalCode);
        logBuildPerformance(userId, {
          source: 'cloud_stream_server',
          ttfcMs: firstCodeAt !== null ? firstCodeAt - streamStartedAt : null,
          durationMs,
          success: true,
          codeChars: finalCode.length,
          progressSource: markerCount > 0 ? 'markers' : 'none',
          markerCount,
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

        send({
          kind: 'status',
          text: skipCredits
            ? ownerBypass && !byoc.skipCredits
              ? `Done via ${selectedModel.label} (owner — no credits charged)`
              : `Done via ${selectedModel.label} (BYOC)`
            : `Done via ${selectedModel.label} (−${creditCost} credit${creditCost === 1 ? '' : 's'})`,
        });
        send('[DONE]');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        if (didDeduct && deductedAmount > 0) {
          await refundCloudCreditsForContext(chargeContext, deductedAmount).catch(() => {});
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

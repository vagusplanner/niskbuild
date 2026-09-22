import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import {
  deductCloudCreditsForContext,
  refundCloudCreditsForContext,
  resolveCreditChargeContext,
} from '@/lib/org-credits';
import { recordAnonymousTelemetry } from '@/lib/record-telemetry';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import { canUseOwnApiKeys, resolveProductGatingBypass } from '@/lib/tier-access-server';
import {
  canSelectGenerationModel,
  getGenerationModel,
  isGenerationModelId,
} from '@/lib/generation-models';
import {
  resolveByocSkip,
  streamSelectedGenerationModel,
} from '@/lib/generation-providers';

async function getUserProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, use_own_api_keys, openai_api_key, anthropic_api_key, email'
    )
    .eq('id', userId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { prompt, projectId, modelId } = body as {
      prompt?: string;
      projectId?: string;
      modelId?: string;
    };
    const userId = guard.user!.id;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const selectedModel = getGenerationModel(
      isGenerationModelId(modelId) ? modelId : undefined
    );

    const chargeResolved = await resolveCreditChargeContext({
      actingUserId: userId,
      projectId: typeof projectId === 'string' ? projectId : null,
    });
    if (!chargeResolved.ok) {
      return NextResponse.json(
        { error: chargeResolved.error },
        { status: chargeResolved.status }
      );
    }
    const chargeContext = chargeResolved.context;

    const profile = await getUserProfile(userId);
    const ownerBypass = await resolveProductGatingBypass(userId);
    const tier = profile?.subscription_tier || 'free';
    const status = profile?.subscription_status || 'inactive';

    if (!chargeContext.isOrgPool && !canSpendCloudCredits(tier, status, ownerBypass)) {
      return NextResponse.json(
        { error: outOfCreditsMessage(tier, status, ownerBypass) },
        { status: 403 }
      );
    }

    if (!canSelectGenerationModel(selectedModel, tier) && !ownerBypass) {
      return NextResponse.json(
        {
          error: `${selectedModel.label} requires Pro Worker or above. Upgrade to unlock premium models.`,
          upgrade: true,
        },
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
    const skipCredits = byoc.skipCredits;
    const creditCost = selectedModel.creditCost;

    let creditsRemaining: number | undefined;
    let didDeduct = false;

    if (!skipCredits) {
      const creditResult = await deductCloudCreditsForContext(chargeContext, creditCost);
      if (!creditResult.ok) {
        return NextResponse.json(
          { error: creditResult.error || 'Insufficient cloud credits' },
          { status: 402 }
        );
      }
      creditsRemaining = creditResult.remaining;
      didDeduct = true;
    }

    const result = await streamSelectedGenerationModel(
      prompt,
      selectedModel,
      () => {},
      { useOwnKeys, keys: keyBundle }
    );

    if (result.ok) {
      await recordAnonymousTelemetry(
        {
          prompt,
          generatedCode: result.code,
          aiModelUsed: skipCredits ? `byoc:${selectedModel.id}` : selectedModel.id,
          generationSuccess: true,
        },
        userId
      );

      void recordUsageEvent({
        eventType: 'build',
        userId,
        prompt,
        projectId: typeof projectId === 'string' ? projectId : null,
        clientIp: clientIpFromHeaders(request.headers),
      });
      void recordPromptCategoryStat({ userId, prompt });
      void touchLastBuildAt(userId);

      return NextResponse.json({
        success: true,
        code: result.code,
        source: skipCredits ? 'user-keys' : selectedModel.provider,
        modelId: selectedModel.id,
        creditsUsed: skipCredits ? 0 : creditCost,
        creditsRemaining,
        usedOwnKeys: skipCredits,
        byocAllowed,
      });
    }

    if (didDeduct) {
      await refundCloudCreditsForContext(chargeContext, creditCost).catch(() => {});
    }

    await recordAnonymousTelemetry(
      {
        prompt,
        aiModelUsed: selectedModel.id,
        generationSuccess: false,
      },
      userId
    );

    return NextResponse.json(
      { error: result.error || 'Generation failed' },
      { status: 500 }
    );
  } catch (error) {
    return apiErrorResponse(error, 'Failed to generate code');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { generateCode } from '@/lib/ai-providers';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import {
  deductCloudCreditForContext,
  refundCloudCreditsForContext,
  resolveCreditChargeContext,
} from '@/lib/org-credits';
import { recordAnonymousTelemetry } from '@/lib/record-telemetry';
import { recordUsageEvent } from '@/lib/usage-events';
import { recordPromptCategoryStat } from '@/lib/prompt-category-stats';
import { touchLastBuildAt } from '@/lib/build-activity';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import { canUseOwnApiKeys } from '@/lib/tier-config';

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
    const { prompt, projectId } = await request.json();
    const userId = guard.user!.id;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

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
    const tier = profile?.subscription_tier || 'free';
    const status = profile?.subscription_status || 'inactive';

    if (!chargeContext.isOrgPool && !canSpendCloudCredits(tier, status)) {
      return NextResponse.json(
        { error: outOfCreditsMessage(tier, status) },
        { status: 403 }
      );
    }

    const byocAllowed = canUseOwnApiKeys(tier);
    const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
    const hasUserKeys = !!(profile?.openai_api_key || profile?.anthropic_api_key);
    const skipCredits = useOwnKeys && hasUserKeys;

    let creditsRemaining: number | undefined;
    let didDeduct = false;

    if (!skipCredits) {
      const creditResult = await deductCloudCreditForContext(chargeContext);
      if (!creditResult.ok) {
        return NextResponse.json(
          { error: creditResult.error || 'Insufficient cloud credits' },
          { status: 402 }
        );
      }
      creditsRemaining = creditResult.remaining;
      didDeduct = true;
    }

    const result = await generateCode(prompt, tier, {
      useOwnKeys,
      openaiKey: byocAllowed ? profile?.openai_api_key : null,
      anthropicKey: byocAllowed ? profile?.anthropic_api_key : null,
    });

    if (result.success) {
      await recordAnonymousTelemetry(
        {
          prompt,
          generatedCode: result.code,
          aiModelUsed: skipCredits ? 'user-keys' : result.provider,
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
        source: skipCredits ? 'user-keys' : result.provider,
        creditsRemaining,
        usedOwnKeys: skipCredits,
        byocAllowed,
      });
    }

    if (didDeduct) {
      await refundCloudCreditsForContext(chargeContext, 1).catch(() => {});
    }

    await recordAnonymousTelemetry(
      {
        prompt,
        aiModelUsed: result.provider,
        generationSuccess: false,
      },
      userId
    );

    return NextResponse.json(
      { error: result.error || 'All AI providers failed' },
      { status: 500 }
    );
  } catch (error) {
    return apiErrorResponse(error, 'Failed to generate code');
  }
}

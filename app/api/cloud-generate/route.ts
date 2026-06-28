import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { generateCode } from '@/lib/ai-providers';
import { createAdminClient } from '@/lib/supabase/admin';
import { deductCloudCredit } from '@/lib/credits';
import { canSpendCloudCredits, outOfCreditsMessage } from '@/lib/credits-init';
import { recordAnonymousTelemetry } from '@/lib/record-telemetry';
import { recordUsageEvent } from '@/lib/usage-events';
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

    const profile = await getUserProfile(userId);
    const tier = profile?.subscription_tier || 'free';
    const status = profile?.subscription_status || 'inactive';

    if (!canSpendCloudCredits(tier, status)) {
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

    if (!skipCredits) {
      const creditResult = await deductCloudCredit(userId);
      if (!creditResult.ok) {
        return NextResponse.json(
          { error: creditResult.error || 'Insufficient cloud credits' },
          { status: 402 }
        );
      }
      creditsRemaining = creditResult.remaining;
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

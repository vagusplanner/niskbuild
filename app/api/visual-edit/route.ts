import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { generateCode } from '@/lib/ai-providers';
import { deductCloudCredits } from '@/lib/credits';
import { logVisualEdit } from '@/lib/log-visual-edit';
import { buildVisualEditPrompt } from '@/lib/visual-editor-prompt';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseOwnApiKeys, isPaidAndActive } from '@/lib/tier-config';
import type { StyleChanges } from '@/lib/visual-editor-types';
import { VISUAL_EDIT_CREDIT_COST } from '@/lib/visual-editor-types';

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
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const userId = guard.user!.id;

    const currentCode = typeof body.currentCode === 'string' ? body.currentCode.trim() : '';
    const selector = typeof body.selector === 'string' ? body.selector : '';
    const breadcrumb = Array.isArray(body.breadcrumb) ? body.breadcrumb.map(String) : [];
    const styles = (body.styles || {}) as StyleChanges;
    const isMobile = body.isMobile === true;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : userId;

    if (!currentCode || !selector) {
      return NextResponse.json({ error: 'currentCode and selector are required' }, { status: 400 });
    }

    const profile = await getUserProfile(userId);
    const tier = profile?.subscription_tier || 'free';
    const status = profile?.subscription_status || 'inactive';

    if (!isPaidAndActive(tier, status)) {
      return NextResponse.json(
        {
          error: 'Visual edits that persist to code require an active Pro plan or higher.',
          upgrade: true,
        },
        { status: 403 }
      );
    }

    const byocAllowed = canUseOwnApiKeys(tier);
    const useOwnKeys = byocAllowed && !!profile?.use_own_api_keys;
    const hasUserKeys = !!(profile?.openai_api_key || profile?.anthropic_api_key);
    const skipCredits = useOwnKeys && hasUserKeys;

    let creditsRemaining: number | undefined;

    if (!skipCredits) {
      const creditResult = await deductCloudCredits(userId, VISUAL_EDIT_CREDIT_COST);
      if (!creditResult.ok) {
        return NextResponse.json(
          { error: creditResult.error || 'Insufficient cloud credits', upgrade: true },
          { status: 402 }
        );
      }
      creditsRemaining = creditResult.remaining;
    }

    const componentName = breadcrumb[breadcrumb.length - 1] || 'element';
    const prompt = buildVisualEditPrompt({
      componentName,
      breadcrumb,
      selector,
      styles,
      currentCode,
      isMobile,
    });

    const result = await generateCode(prompt, tier, {
      useOwnKeys,
      openaiKey: byocAllowed ? profile?.openai_api_key : null,
      anthropicKey: byocAllowed ? profile?.anthropic_api_key : null,
    });

    if (!result.success || !result.code) {
      return NextResponse.json(
        { error: result.error || 'Visual edit generation failed' },
        { status: 500 }
      );
    }

    await logVisualEdit({
      userId,
      sessionId,
      subscriptionTier: tier,
    });

    return NextResponse.json({
      success: true,
      code: result.code,
      creditsUsed: VISUAL_EDIT_CREDIT_COST,
      creditsRemaining,
      usedOwnKeys: skipCredits,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Visual edit failed');
  }
}

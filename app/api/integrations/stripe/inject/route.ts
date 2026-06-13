import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { cleanGeneratedCode } from '@/lib/cleanGeneratedCode';
import { deductCloudCredits } from '@/lib/credits';
import { getGroqClient } from '@/lib/groq-client';
import { STRIPE_INJECT_CREDIT_COST } from '@/lib/integrations-config';
import { logStripeIntegration } from '@/lib/log-stripe-integration';
import { buildStripeInjectSystemPrompt } from '@/lib/stripe-inject-prompt';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseStripeInject } from '@/lib/tier-config';

async function assertProjectOwner(userId: string, projectId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('projects')
    .select('id, generated_code, blueprint_json, user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;

  try {
    const body = await request.json();
    const {
      projectId,
      paymentType,
      productName,
      price,
      currency,
      publishableKey,
      stripeSecretKey,
      currentCode,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }
    if (!productName?.trim() || !price || !publishableKey?.trim()) {
      return NextResponse.json(
        { error: 'Product name, price, and Stripe publishable key are required' },
        { status: 400 }
      );
    }
    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Invalid Stripe publishable key (must start with pk_)' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single();

    if (!canUseStripeInject(profile?.subscription_tier, profile?.subscription_status)) {
      return NextResponse.json(
        { error: 'Pro plan required for Stripe integration', upgrade: true },
        { status: 403 }
      );
    }

    const project = await assertProjectOwner(userId, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const creditResult = await deductCloudCredits(userId, STRIPE_INJECT_CREDIT_COST);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient credits (2 required)' },
        { status: 402 }
      );
    }

    const groq = getGroqClient();
    if (!groq) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const sourceCode =
      (typeof currentCode === 'string' && currentCode.trim()) ||
      project.generated_code ||
      '';

    if (!sourceCode.trim()) {
      return NextResponse.json({ error: 'No project code to inject into' }, { status: 400 });
    }

    const injectConfig = {
      paymentType: paymentType === 'subscription' ? 'subscription' as const : 'one-time' as const,
      productName: String(productName).trim(),
      price: String(price),
      currency: (currency || 'GBP').toUpperCase(),
      publishableKey: String(publishableKey).trim(),
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildStripeInjectSystemPrompt(injectConfig) },
        {
          role: 'user',
          content: `Blueprint context:\n${JSON.stringify(project.blueprint_json || {}).slice(0, 2000)}\n\nCurrent app code:\n${sourceCode.slice(0, 12000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 8192,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const updatedCode = cleanGeneratedCode(raw);

    if (!updatedCode || updatedCode.length < 50) {
      return NextResponse.json({ error: 'AI failed to produce valid code' }, { status: 502 });
    }

    const configJson: Record<string, unknown> = {
      paymentType: injectConfig.paymentType,
      productName: injectConfig.productName,
      price: injectConfig.price,
      currency: injectConfig.currency,
      publishableKey: injectConfig.publishableKey,
    };
    if (typeof stripeSecretKey === 'string' && stripeSecretKey.startsWith('sk_')) {
      configJson.stripe_secret_key = stripeSecretKey.trim();
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('projects')
      .update({ generated_code: updatedCode })
      .eq('id', projectId)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: integrationError } = await supabase.from('project_integrations').upsert(
      {
        project_id: projectId,
        integration_name: 'stripe',
        status: 'active',
        config_json: configJson,
        added_at: now,
      },
      { onConflict: 'project_id,integration_name' }
    );

    if (integrationError) {
      console.error('project_integrations upsert:', integrationError.message);
    }

    await logStripeIntegration({
      userId,
      sessionId: projectId,
      subscriptionTier: profile?.subscription_tier || 'pro',
    });

    return NextResponse.json({
      success: true,
      code: updatedCode,
      creditsRemaining: creditResult.remaining,
      message:
        'Stripe payments added to your project. Users can pay with card, Apple Pay, and Google Pay.',
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { compileBlueprint } from '@/lib/blueprint-compiler';
import { generateBlueprint } from '@/lib/blueprint-generator';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { getProjectLimit } from '@/lib/project-limits';
import { getCloudCreditsForTier, isPaidAndActive } from '@/lib/tier-config';
import { generateArchitecturePlan } from '@/lib/plan-mode';

/**
 * POST /api/builder
 *
 * Modes:
 * 1. planOnly=true — Markdown roadmap via Groq
 * 2. prompt (+ optional projectId) — blueprint generate + compile
 * 3. default / empty body — workspace boot guard
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return handleBootGuard();
  }

  if (body.planOnly === true) {
    return handlePlanMode(body);
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt) {
    return handleBlueprintBuild(body, guard.user!);
  }

  return handleBootGuard();
}

async function handlePlanMode(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required for plan mode' }, { status: 400 });
  }

  const { user, profile } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';
  if (!isPaidAndActive(tier, status)) {
    return NextResponse.json(
      { error: 'Active paid subscription required for plan mode' },
      { status: 403 }
    );
  }

  const result = await generateArchitecturePlan(prompt);

  if (!result.success || !result.plan) {
    return NextResponse.json(
      { error: result.error || 'Failed to generate plan' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    plan: result.plan,
    planOnly: true,
    creditsDeducted: 0,
  });
}

async function handleBlueprintBuild(body: Record<string, unknown>, user: User) {
  try {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId : undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const blueprint = await generateBlueprint(prompt, user.id);
    if (!blueprint) {
      return NextResponse.json({ error: 'Failed to generate blueprint' }, { status: 500 });
    }

    const { code: compiledCode, compiler: compilerUsed } = compileBlueprint(blueprint);

    if (projectId) {
      const { supabase } = await getAuthenticatedProfile();
      const { error } = await supabase
        .from('projects')
        .update({
          blueprint_json: blueprint,
          generated_code: compiledCode,
          prompt,
        })
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Blueprint project save error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      blueprint,
      code: compiledCode,
      compiler: compilerUsed,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to build application');
  }
}

async function handleBootGuard() {
  const { supabase, user, profile } = await getAuthenticatedProfile();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', canBoot: false }, { status: 401 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';
  const paidActive = isPaidAndActive(tier, status);

  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message, canBoot: false }, { status: 500 });
  }

  const projectCount = count ?? 0;
  const limit = getProjectLimit(tier);
  const atCap = projectCount >= limit;

  const isSandbox = tier === 'free';

  return NextResponse.json({
    canBoot: !atCap && (isSandbox || paidActive),
    paidActive,
    isSandbox,
    atCap,
    projectCount,
    projectLimit: limit,
    tier,
    status,
    cloudCreditsRemaining: profile?.cloud_credits_remaining ?? 0,
    cloudCreditsAllowance: getCloudCreditsForTier(tier),
  });
}

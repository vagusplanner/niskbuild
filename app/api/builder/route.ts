import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { getProjectLimit } from '@/lib/project-limits';
import { getCloudCreditsForTier, isPaidAndActive } from '@/lib/tier-config';
import { generateArchitecturePlan } from '@/lib/plan-mode';

/**
 * POST /api/builder
 *
 * Two modes:
 * 1. planOnly=true — returns Markdown roadmap via Groq; no cloud credit deduction
 * 2. default — workspace boot guard (paid + project cap check)
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Empty body = boot guard only (e.g. on builder mount)
  }

  if (body.planOnly === true) {
    return handlePlanMode(body);
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

  return NextResponse.json({
    canBoot: paidActive && !atCap,
    paidActive,
    atCap,
    projectCount,
    projectLimit: limit,
    tier,
    status,
    cloudCreditsRemaining: profile?.cloud_credits_remaining ?? 0,
    cloudCreditsAllowance: getCloudCreditsForTier(tier),
  });
}

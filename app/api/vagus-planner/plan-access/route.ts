import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectivePlan } from '@/lib/vp-plan-access';
import { getUsageSnapshot, loadUserPlanContext } from '@/lib/vp-usage-meter';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

const TRACKED_FEATURES = ['ai_calendar_summary', 'ai_scheduler', 'ai_requests'] as const;

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Server-authoritative plan + feature usage for Vagus Planner UI gates.
 * Clients may use this for UpgradeGate UX; enforcement still happens on mutate paths.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const admin = createAdminClient();
    const userId = guard.user!.id;
    const platformOwnerBypass = await isPlatformOwner(userId);
    const { subscriptions, profile } = await loadUserPlanContext(admin, userId);
    const planInfo = resolveEffectivePlan({ subscriptions, profile });

    const usageEntries = await Promise.all(
      TRACKED_FEATURES.map((feature) =>
        getUsageSnapshot(admin, { userId, plan: planInfo.plan, feature })
      )
    );

    const usage = Object.fromEntries(usageEntries.map((u) => [u.feature, u]));

    return vpApiJson(request, {
      plan: planInfo.plan,
      status: planInfo.status,
      source: planInfo.source,
      isPaid: planInfo.isPaid,
      hasPaidIslamicAccess: planInfo.hasPaidIslamicAccess,
      platformOwnerBypass,
      usage,
    });
  } catch (error) {
    captureApiException(error);
    return vpApiJson(
      request,
      { error: 'Failed to verify plan access', plan: 'free', isPaid: false },
      { status: 500 }
    );
  }
}

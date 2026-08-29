import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectivePlan } from '@/lib/vp-plan-access';
import { loadUserPlanContext } from '@/lib/vp-usage-meter';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Server-authoritative Islamic Edition entitlement check.
 * Uses service_role reads so clients cannot forge paid access via localStorage
 * or by writing fake rows (after RLS hardening).
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const admin = createAdminClient();
    const userId = guard.user!.id;
    const { subscriptions, profile } = await loadUserPlanContext(admin, userId);
    const planInfo = resolveEffectivePlan({ subscriptions, profile });
    const platformOwnerBypass = await isPlatformOwner();

    return vpApiJson(request, {
      hasPaidIslamicAccess: planInfo.hasPaidIslamicAccess,
      plan: planInfo.hasPaidIslamicAccess ? planInfo.plan : null,
      status: planInfo.hasPaidIslamicAccess ? planInfo.status : null,
      source: planInfo.hasPaidIslamicAccess ? planInfo.source : null,
      platformOwnerBypass,
    });
  } catch (error) {
    captureApiException(error);
    return vpApiJson(
      request,
      { error: 'Failed to verify Islamic Edition access', hasPaidIslamicAccess: false },
      { status: 500 }
    );
  }
}

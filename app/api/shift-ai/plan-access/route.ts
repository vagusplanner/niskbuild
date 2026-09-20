import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { resolveRequestUser } from '@/lib/shift-ai/student-auth';
import { resolveShiftPlanAccess } from '@/lib/shift-ai/plan-access';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

/**
 * Server-authoritative SuperEduc8 plan access (mirrors VP /plan-access).
 * Clients may use this for UpgradeGate UX; enforcement must stay on mutate paths.
 */
export async function GET(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const access = await resolveShiftPlanAccess(user.id);
    return shiftAiApiJson(request, access);
  } catch (error) {
    captureApiException(error);
    return shiftAiApiJson(
      request,
      {
        error: 'Failed to verify plan access',
        plan: 'free',
        status: 'none',
        isPaid: false,
        platformOwnerBypass: false,
        hasFullAccess: false,
      },
      { status: 500 }
    );
  }
}

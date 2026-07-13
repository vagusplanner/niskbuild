import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { exportVagusPlannerUserData } from '@/lib/vp-gdpr/export-user-data';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * GDPR portability export for the authenticated Vagus Planner user.
 * Returns JSON covering all known firstparty.vp_* tables + upload refs.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 6 });
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const admin = createAdminClient();
    const payload = await exportVagusPlannerUserData(admin, guard.user!);
    return withVpApiCors(
      request,
      NextResponse.json(payload, {
        headers: {
          'Content-Disposition': `attachment; filename="VagusPlanner_Data_Export_${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    );
  } catch (error) {
    return withVpApiCors(request, apiErrorResponse(error, 'Failed to export data'));
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

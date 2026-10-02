import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { isNsStaffUser } from '@/lib/ns-staff';
import { clearNsGoogleCalendarConnection } from '@/lib/ns-google-calendar/tokens';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/** Revoke + clear NS coach Calendar connection. Staff-only. */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withNsApiCors(request, guard.response);
  if (!guard.user) {
    return nsApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await isNsStaffUser(guard.user.id);
  if (!staff) {
    return nsApiJson(
      request,
      { error: 'Only North South staff can disconnect Calendar', code: 'NS_STAFF_REQUIRED' },
      { status: 403 }
    );
  }

  try {
    await clearNsGoogleCalendarConnection(guard.user.id, { revokeAtGoogle: true });
    return nsApiJson(request, { success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disconnect failed';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}

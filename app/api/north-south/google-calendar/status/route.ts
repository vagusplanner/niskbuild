import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { isNsStaffUser } from '@/lib/ns-staff';
import {
  getNsGoogleCalendarOAuthDebug,
  isNsGoogleCalendarOAuthConfigured,
} from '@/lib/ns-google-calendar/oauth';
import {
  loadNsGoogleCalendarConnection,
  loadPrimaryNsGoogleCalendarConnection,
} from '@/lib/ns-google-calendar/tokens';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/** Honest connection status — never returns tokens. Staff see coach connect state. */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 60 });
  if (!guard.ok) return withNsApiCors(request, guard.response);
  if (!guard.user) {
    return nsApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await isNsStaffUser(guard.user.id);
  const configured = isNsGoogleCalendarOAuthConfigured();
  const own = await loadNsGoogleCalendarConnection(guard.user.id);
  const primary = staff ? await loadPrimaryNsGoogleCalendarConnection() : null;
  const row = own || primary;
  const connected = Boolean(row && (row.access_token || row.refresh_token));

  return nsApiJson(request, {
    configured,
    isStaff: staff,
    connected,
    googleAccountEmail: connected ? row?.calendar_email ?? null : null,
    connectedUserId: connected ? row?.user_id ?? null : null,
    isOwnConnection: Boolean(own && (own.access_token || own.refresh_token)),
    oauthDebug: getNsGoogleCalendarOAuthDebug(),
  });
}

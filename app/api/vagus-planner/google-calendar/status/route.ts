import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { isGoogleCalendarOAuthConfigured } from '@/lib/google-calendar/oauth';
import { loadGoogleCalendarConnection } from '@/lib/google-calendar/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/** Honest connection status — never returns tokens. */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 60 });
  if (!guard.ok) return withVpApiCors(request, guard.response);
  if (!guard.user) {
    return vpApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const configured = isGoogleCalendarOAuthConfigured();
  const row = await loadGoogleCalendarConnection(guard.user.id);
  const connected = Boolean(row && row.status === 'active' && row.access_token);

  let lastSyncedAt: string | null = null;
  let syncStatus: string | null = null;
  let hasSyncToken = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .schema('firstparty')
      .from('vp_sync_states')
      .select('last_synced_at, status, sync_token')
      .eq('user_id', guard.user.id)
      .eq('service', 'googlecalendar')
      .maybeSingle();
    lastSyncedAt = (data?.last_synced_at as string) ?? null;
    syncStatus = (data?.status as string) ?? null;
    hasSyncToken = Boolean(data?.sync_token);
  } catch {
    /* optional */
  }

  return vpApiJson(request, {
    configured,
    connected,
    needsReconnect: Boolean(row && row.status !== 'active'),
    googleAccountEmail: connected ? row?.google_account_email ?? null : null,
    calendarId: connected ? row?.calendar_id ?? 'primary' : null,
    lastSyncedAt,
    syncStatus,
    hasSyncToken,
    syncDirection: 'one_way_pull',
    scopes: connected ? row?.scopes ?? null : null,
  });
}

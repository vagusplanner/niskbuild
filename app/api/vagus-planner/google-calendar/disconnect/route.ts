import { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  clearGoogleCalendarConnection,
  markUserSettingsDisconnected,
} from '@/lib/google-calendar/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Revoke Google tokens, clear server connection, disconnect settings,
 * and delete imported google_calendar events (matches prior UI promise).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withVpApiCors(request, guard.response);
  if (!guard.user) {
    return vpApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const deleteEvents = body?.deleteEvents !== false;

  try {
    await clearGoogleCalendarConnection(guard.user.id, { revokeAtGoogle: true });
    await markUserSettingsDisconnected(guard.user.id);

    // Clear sync cursor so reconnect starts fresh
    const admin = createAdminClient();
    await admin
      .schema('firstparty')
      .from('vp_sync_states')
      .update({
        sync_token: null,
        status: 'idle',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', guard.user.id)
      .eq('service', 'googlecalendar');

    let deletedCount = 0;
    if (deleteEvents) {
      const { data, error } = await admin
        .schema('firstparty')
        .from('vp_events')
        .delete()
        .eq('user_id', guard.user.id)
        .eq('source', 'google_calendar')
        .select('id');
      if (!error && Array.isArray(data)) deletedCount = data.length;
    }

    return vpApiJson(request, {
      success: true,
      deletedEvents: deletedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Disconnect failed';
    return vpApiJson(request, { error: message }, { status: 500 });
  }
}

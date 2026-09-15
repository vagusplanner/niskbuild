import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

const VALID_PLATFORMS = new Set(['ios', 'android']);

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

/**
 * Store Capacitor APNs/FCM device tokens for VP push delivery.
 * Auth via Bearer (Capacitor) or cookies (web); writes use admin client so
 * RLS is not blocked when there is no cookie session on capacitor:// origins.
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  const user = guard.user!;
  const body = await request.json().catch(() => ({}));
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken.trim() : '';
  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.has(body.platform)
      ? body.platform
      : 'ios';

  if (!pushToken || pushToken.length < 32) {
    return vpApiJson(request, { error: 'Invalid push token' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('vp_device_tokens')
    .upsert(
      {
        user_id: user.id,
        push_token: pushToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,push_token' }
    );

  if (error) {
    console.error('register-device error:', error);
    return vpApiJson(request, { error: 'Failed to register device' }, { status: 500 });
  }

  return vpApiJson(request, { success: true, platform });
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  const body = await request.json().catch(() => ({}));
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken.trim() : '';

  if (!pushToken) {
    return vpApiJson(request, { error: 'pushToken required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .schema('firstparty')
    .from('vp_device_tokens')
    .delete()
    .eq('user_id', guard.user!.id)
    .eq('push_token', pushToken);

  if (error) {
    return vpApiJson(request, { error: 'Failed to unregister device' }, { status: 500 });
  }

  return vpApiJson(request, { success: true });
}

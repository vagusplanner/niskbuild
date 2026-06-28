import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

const VALID_PLATFORMS = new Set(['ios', 'android']);

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const user = guard.user!;
  const body = await request.json().catch(() => ({}));
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken.trim() : '';
  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.has(body.platform)
      ? body.platform
      : 'ios';

  if (!pushToken || pushToken.length < 32) {
    return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
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
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  }

  return NextResponse.json({ success: true, platform });
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const pushToken = typeof body.pushToken === 'string' ? body.pushToken.trim() : '';

  if (!pushToken) {
    return NextResponse.json({ error: 'pushToken required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema('firstparty')
    .from('vp_device_tokens')
    .delete()
    .eq('user_id', guard.user!.id)
    .eq('push_token', pushToken);

  if (error) {
    return NextResponse.json({ error: 'Failed to unregister device' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

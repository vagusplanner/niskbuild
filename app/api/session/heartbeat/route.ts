import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserSessionLimit, registerSession } from '@/lib/session-tracker';

export async function POST(request: NextRequest) {
  try {
    const guard = await guardApiRequest(request);
    if (!guard.ok) return guard.response;

    const { sessionToken, deviceFingerprint } = await request.json();
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'sessionToken required' }, { status: 400 });
    }
    if (!deviceFingerprint || typeof deviceFingerprint !== 'string') {
      return NextResponse.json({ error: 'deviceFingerprint required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', guard.user!.id)
      .single();

    const ua = request.headers.get('user-agent') || undefined;

    const result = await registerSession(
      guard.user!.id,
      sessionToken,
      deviceFingerprint,
      profile?.email ?? guard.user!.email,
      ua
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          pendingConfirmation: result.pendingConfirmation ?? false,
          blocked: result.blocked ?? false,
        },
        { status: 403 }
      );
    }

    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', guard.user!.id);

    const sessionLimit = await getUserSessionLimit(guard.user!.id);

    return NextResponse.json({
      ok: true,
      sessionLimit,
      evicted: result.ok && 'evicted' in result ? result.evicted : false,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Internal error');
  }
}

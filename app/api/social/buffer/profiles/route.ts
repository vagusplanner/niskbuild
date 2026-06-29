import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { apiErrorResponse } from '@/lib/api-error';
import { loadBufferTokenRow } from '@/lib/buffer/client';
import {
  BufferAuthExpiredError,
  getBufferProfilesForUser,
} from '@/lib/social-hub/buffer-client';
import { canDirectPublishSocial, hasSocialProAddon } from '@/lib/tier-config';
import { createAdminClient } from '@/lib/supabase/admin';

async function userCanPublish(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .maybeSingle();

  const tier = profile?.subscription_tier ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';

  const { data: purchases } = await admin
    .from('purchased_templates')
    .select('template_id')
    .eq('user_id', userId);

  const socialPro = hasSocialProAddon(purchases?.map((p) => p.template_id) ?? []);
  return canDirectPublishSocial(tier, status, socialPro);
}

/** List Buffer social profiles for the connected user */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!(await userCanPublish(guard.user.id))) {
      return NextResponse.json(
        { error: 'Agency+ or Social Pro required for Buffer publish' },
        { status: 403 }
      );
    }

    const row = await loadBufferTokenRow(guard.user.id);
    if (!row) {
      return NextResponse.json({ connected: false, profiles: [] });
    }

    const profiles = await getBufferProfilesForUser(guard.user.id);
    return NextResponse.json({ connected: true, profiles });
  } catch (error) {
    if (error instanceof BufferAuthExpiredError) {
      return NextResponse.json(
        {
          connected: false,
          needsReconnect: true,
          error: error.message,
          reconnectUrl: '/api/social/buffer/auth',
        },
        { status: 401 }
      );
    }
    return apiErrorResponse(error, 'Failed to load Buffer profiles');
  }
}

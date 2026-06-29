import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { apiErrorResponse } from '@/lib/api-error';
import {
  BufferAuthExpiredError,
  BufferRateLimitError,
  isBufferPublishPlatform,
  publishToBufferForUser,
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

function formatScheduledLabel(iso: string | null): string {
  if (!iso) return 'Buffer\'s next available slot';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/** Create a Buffer update (schedule post to queue) */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
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

    const body = await request.json();
    const platform = typeof body.platform === 'string' ? body.platform : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const profileId = typeof body.profileId === 'string' ? body.profileId : undefined;
    const scheduledAt =
      typeof body.scheduledAt === 'string' && body.scheduledAt.trim()
        ? body.scheduledAt.trim()
        : null;

    if (!isBufferPublishPlatform(platform)) {
      return NextResponse.json(
        { error: 'This platform cannot be sent to Buffer directly' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json({ error: 'Post text is required' }, { status: 400 });
    }

    const result = await publishToBufferForUser({
      userId: guard.user.id,
      platform,
      text,
      profileId,
      scheduledAt,
    });

    const admin = createAdminClient();
    const { data: postRow, error: insertError } = await admin
      .schema('firstparty')
      .from('social_posts')
      .insert({
        user_id: guard.user.id,
        platform,
        body: text,
        scheduled_at: result.scheduledAt,
        status: result.scheduledAt ? 'scheduled' : 'queued',
        buffer_update_id: result.updateId,
        metadata: {
          buffer_profile_id: result.profileId,
          buffer_profile_label: result.profileLabel,
        },
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('social_posts insert failed:', insertError.message);
    }

    return NextResponse.json({
      success: true,
      updateId: result.updateId,
      postId: postRow?.id ?? null,
      scheduledAt: result.scheduledAt,
      profileLabel: result.profileLabel,
      message: `Scheduled to Buffer for ${formatScheduledLabel(result.scheduledAt)}`,
    });
  } catch (error) {
    if (error instanceof BufferAuthExpiredError) {
      return NextResponse.json(
        {
          error: 'Your Buffer connection has expired — reconnect to continue.',
          needsReconnect: true,
          reconnectUrl: '/api/social/buffer/auth',
        },
        { status: 401 }
      );
    }
    if (error instanceof BufferRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof Error && error.message === 'multiple_profiles') {
      return NextResponse.json(
        {
          error: 'Multiple Buffer profiles match this platform — pick one first.',
          code: 'multiple_profiles',
        },
        { status: 409 }
      );
    }
    return apiErrorResponse(error, 'Failed to publish to Buffer');
  }
}

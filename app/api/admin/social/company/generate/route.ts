import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { apiErrorResponse } from '@/lib/api-error';
import {
  isBufferPersonalConfigured,
  listAllBufferChannels,
  BufferPersonalApiError,
} from '@/lib/buffer-personal/graphql-client';
import {
  generateCompanySocialPosts,
  generateThisWeeksCompanyDrafts,
  saveCompanyDraft,
  serviceToPlatformKey,
} from '@/lib/buffer-personal/company-posts';
import type { SocialPostKey } from '@/lib/social-publisher';

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;
  if (!owner.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!isBufferPersonalConfigured()) {
      return NextResponse.json(
        { error: 'BUFFER_PERSONAL_API_KEY is not configured on the server' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const mode = body.mode === 'single' ? 'single' : 'weekly';

    if (mode === 'weekly') {
      const result = await generateThisWeeksCompanyDrafts(owner.user.id);
      return NextResponse.json({
        message: `Created ${result.drafts.length} draft(s) ready to review and send.`,
        drafts: result.drafts,
        skipped: result.skipped,
      });
    }

    const channelId = typeof body.channelId === 'string' ? body.channelId : '';
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required for single generate' }, { status: 400 });
    }

    const channels = await listAllBufferChannels();
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found on this Buffer account' }, { status: 404 });
    }

    const platform = serviceToPlatformKey(channel.service);
    if (!platform) {
      return NextResponse.json(
        { error: `Channel service "${channel.service}" is not supported for AI drafts yet` },
        { status: 400 }
      );
    }

    const posts = await generateCompanySocialPosts(
      typeof body.promptHint === 'string' ? body.promptHint : undefined
    );
    const text = posts[platform as SocialPostKey];
    const draft = await saveCompanyDraft({
      userId: owner.user.id,
      platform,
      body: text,
      channel,
    });

    return NextResponse.json({
      message: `Draft ready for ${platform}`,
      draft,
      posts,
    });
  } catch (error) {
    if (error instanceof BufferPersonalApiError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, 'Failed to generate company drafts');
  }
}

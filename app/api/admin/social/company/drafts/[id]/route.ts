import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { apiErrorResponse } from '@/lib/api-error';
import { BufferPersonalApiError } from '@/lib/buffer-personal/graphql-client';
import {
  attachCompanyDraftMedia,
  parseInstagramType,
  publishCompanyDraft,
  updateCompanyDraftBody,
  updateCompanyDraftMeta,
} from '@/lib/buffer-personal/company-posts';
import type { CreateCompanyPostMode } from '@/lib/buffer-personal/graphql-client';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const hasBody = typeof body.body === 'string';
    const hasIgType = 'instagramType' in body;
    const hasMediaUrl = typeof body.mediaUrl === 'string';
    const clearMedia = body.clearMedia === true;

    if (!hasBody && !hasIgType && !hasMediaUrl && !clearMedia) {
      return NextResponse.json(
        { error: 'Provide body, instagramType, mediaUrl, and/or clearMedia' },
        { status: 400 }
      );
    }

    // Simple body-only save keeps prior path
    if (hasBody && !hasIgType && !hasMediaUrl && !clearMedia) {
      const text = body.body.trim();
      if (!text) {
        return NextResponse.json({ error: 'body is required' }, { status: 400 });
      }
      const draft = await updateCompanyDraftBody(id, text);
      return NextResponse.json({ draft });
    }

    const instagramType = hasIgType
      ? body.instagramType === null
        ? null
        : parseInstagramType(body.instagramType)
      : undefined;

    if (hasIgType && body.instagramType != null && !instagramType) {
      return NextResponse.json(
        { error: 'instagramType must be post, story, or reel' },
        { status: 400 }
      );
    }

    let mediaKind: 'image' | 'video' | null | undefined;
    if (hasMediaUrl) {
      const url = String(body.mediaUrl).trim();
      if (!/^https:\/\//i.test(url)) {
        return NextResponse.json(
          { error: 'mediaUrl must be a public https URL (Buffer fetches it later)' },
          { status: 400 }
        );
      }
      mediaKind =
        body.mediaKind === 'video'
          ? 'video'
          : body.mediaKind === 'image'
            ? 'image'
            : /\.(mp4|mov|webm)(\?|$)/i.test(url)
              ? 'video'
              : 'image';
    }

    const draft = await updateCompanyDraftMeta(id, {
      body: hasBody ? body.body : undefined,
      instagramType,
      mediaUrl: hasMediaUrl ? String(body.mediaUrl).trim() : undefined,
      mediaKind,
      clearMedia,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update draft');
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const contentType = request.headers.get('content-type') || '';

    // Multipart = media upload for Instagram drafts
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file') ?? form.get('image') ?? form.get('media');
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File must be under 50MB' }, { status: 400 });
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        return NextResponse.json({ error: 'File must be an image or video' }, { status: 400 });
      }

      const draft = await attachCompanyDraftMedia({
        draftId: id,
        buffer: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || 'application/octet-stream',
        fileName: file.name,
      });

      return NextResponse.json({
        message: 'Media attached to draft',
        draft,
      });
    }

    const body = await request.json();
    const mode = body.mode as CreateCompanyPostMode;
    if (mode !== 'shareNow' && mode !== 'addToQueue' && mode !== 'customScheduled') {
      return NextResponse.json(
        { error: 'mode must be shareNow, addToQueue, or customScheduled' },
        { status: 400 }
      );
    }

    const dueAt =
      typeof body.dueAt === 'string' && body.dueAt.trim() ? body.dueAt.trim() : null;

    const instagramType =
      body.instagramType === undefined
        ? undefined
        : body.instagramType === null
          ? null
          : parseInstagramType(body.instagramType);

    if (body.instagramType != null && instagramType === null) {
      return NextResponse.json(
        { error: 'instagramType must be post, story, or reel' },
        { status: 400 }
      );
    }

    // Persist last-minute edits before send
    if (
      (typeof body.body === 'string' && body.body.trim()) ||
      instagramType !== undefined ||
      typeof body.mediaUrl === 'string'
    ) {
      await updateCompanyDraftMeta(id, {
        body: typeof body.body === 'string' ? body.body : undefined,
        instagramType,
        mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : undefined,
        mediaKind:
          body.mediaKind === 'video' ? 'video' : body.mediaKind === 'image' ? 'image' : undefined,
      });
    }

    const result = await publishCompanyDraft({
      draftId: id,
      mode,
      dueAt,
      instagramType,
    });
    return NextResponse.json({
      message:
        mode === 'shareNow'
          ? 'Published to Buffer (share now).'
          : mode === 'customScheduled'
            ? 'Scheduled in Buffer.'
            : 'Added to Buffer queue.',
      ...result,
    });
  } catch (error) {
    if (error instanceof BufferPersonalApiError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error) {
      const msg = error.message;
      if (
        msg.includes('Instagram') ||
        msg.includes('dueAt') ||
        msg.includes('Schedule time') ||
        msg.includes('queue is paused') ||
        msg.includes('Draft not found') ||
        msg.includes('channelId')
      ) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
    return apiErrorResponse(error, 'Failed to publish draft');
  }
}

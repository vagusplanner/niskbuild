import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { apiErrorResponse } from '@/lib/api-error';
import { BufferPersonalApiError } from '@/lib/buffer-personal/graphql-client';
import {
  publishCompanyDraft,
  updateCompanyDraftBody,
} from '@/lib/buffer-personal/company-posts';
import type { CreateCompanyPostMode } from '@/lib/buffer-personal/graphql-client';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    const draft = await updateCompanyDraftBody(id, text);
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

    // Allow editing body right before send
    if (typeof body.body === 'string' && body.body.trim()) {
      await updateCompanyDraftBody(id, body.body);
    }

    const result = await publishCompanyDraft({ draftId: id, mode, dueAt });
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
    return apiErrorResponse(error, 'Failed to publish draft');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { DOC_CATEGORIES, type DocArticleStatus } from '@/lib/docs/types';
import { captureApiException } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('doc_articles')
      .select('id, slug, title, category, content, plan_visibility, order_index, updated_at, status')
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: data ?? [] });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json({ error: 'Failed to list doc articles' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.title === 'string') updates.title = body.title.trim();
    if (typeof body.slug === 'string') updates.slug = body.slug.trim();
    if (typeof body.content === 'string') updates.content = body.content;
    if (typeof body.category === 'string') {
      if (!(DOC_CATEGORIES as readonly string[]).includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      updates.category = body.category;
    }
    if (body.status === 'draft' || body.status === 'published') {
      updates.status = body.status as DocArticleStatus;
    }
    if (typeof body.order_index === 'number') updates.order_index = body.order_index;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('doc_articles')
      .update(updates)
      .eq('id', id)
      .select('id, slug, title, category, content, plan_visibility, order_index, updated_at, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ article: data });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json({ error: 'Failed to update doc article' }, { status: 500 });
  }
}

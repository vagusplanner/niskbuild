import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = new Set(['draft', 'active', 'inactive', 'archived']);

export async function GET(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: app, error } = await admin
      .schema('firstparty')
      .from('app_registry')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ app });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load app');
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const admin = createAdminClient();

    const updates: Record<string, string> = {};

    if (typeof body.app_name === 'string' && body.app_name.trim()) {
      updates.app_name = body.app_name.trim();
    }

    if (body.action === 'toggle_status') {
      const { data: current } = await admin
        .schema('firstparty')
        .from('app_registry')
        .select('status')
        .eq('id', id)
        .single();

      if (!current) {
        return NextResponse.json({ error: 'App not found' }, { status: 404 });
      }

      updates.status = current.status === 'active' ? 'inactive' : 'active';
    } else if (typeof body.status === 'string' && VALID_STATUSES.has(body.status)) {
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const { data, error } = await admin
      .schema('firstparty')
      .from('app_registry')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ app: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update app');
  }
}

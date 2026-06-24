import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as 'approve' | 'reject' | 'feature' | 'unfeature' | undefined;

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: current, error: fetchError } = await admin
      .schema('marketplace')
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!current) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const appSource = { ...(current.app_source as Record<string, unknown>) };
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'approve') {
      updates.is_active = true;
    } else if (action === 'reject') {
      updates.is_active = false;
    } else if (action === 'feature') {
      appSource.featured = true;
      updates.app_source = appSource;
    } else if (action === 'unfeature') {
      appSource.featured = false;
      updates.app_source = appSource;
    }

    const { data, error } = await admin
      .schema('marketplace')
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update listing');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const admin = createAdminClient();

    const { data: tenant, error } = await admin
      .from('profiles')
      .select(
        'id, email, subscription_tier, subscription_status, created_at, last_seen_at, cloud_credits_remaining, stripe_customer_id, subscription_id'
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { count: projectCount } = await admin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    return NextResponse.json({ tenant: { ...tenant, project_count: projectCount ?? 0 } });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load tenant');
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action as 'suspend' | 'activate' | undefined;

    if (action !== 'suspend' && action !== 'activate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const admin = createAdminClient();
    const subscription_status = action === 'suspend' ? 'inactive' : 'active';

    const { data, error } = await admin
      .from('profiles')
      .update({ subscription_status })
      .eq('id', id)
      .select('id, email, subscription_tier, subscription_status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenant: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update tenant');
  }
}

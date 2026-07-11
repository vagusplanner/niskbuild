import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.dedicatedInfraInterest === 'boolean') {
      updates.dedicated_infra_interest = body.dedicatedInfraInterest;
    }
    if (typeof body.dedicatedInfraNotes === 'string') {
      updates.dedicated_infra_notes = body.dedicatedInfraNotes.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select(
        'id, name, billing_owner_id, dedicated_infra_interest, dedicated_infra_notes, created_at'
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    return NextResponse.json({ organization: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update organization');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const interestOnly = request.nextUrl.searchParams.get('interest') === '1';
    const admin = createAdminClient();
    let query = admin
      .from('organizations')
      .select(
        'id, name, billing_owner_id, dedicated_infra_interest, dedicated_infra_notes, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (interestOnly) {
      query = query.eq('dedicated_infra_interest', true);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ organizations: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to list organizations');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const tier = request.nextUrl.searchParams.get('tier');
    const status = request.nextUrl.searchParams.get('status');
    const admin = createAdminClient();

    let query = admin
      .from('profiles')
      .select('id, email, subscription_tier, subscription_status, created_at, last_seen_at')
      .order('created_at', { ascending: false });

    if (tier && tier !== 'all') {
      query = query.eq('subscription_tier', tier);
    }
    if (status && status !== 'all') {
      query = query.eq('subscription_status', status);
    }

    const { data: tenants, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = tenants ?? [];
    const activeCount = rows.filter((t) => t.subscription_status === 'active').length;
    const paidCount = rows.filter(
      (t) => t.subscription_tier && t.subscription_tier !== 'free'
    ).length;

    const tierCounts: Record<string, number> = {};
    for (const row of rows) {
      const key = row.subscription_tier || 'free';
      tierCounts[key] = (tierCounts[key] ?? 0) + 1;
    }

    return NextResponse.json({
      tenants: rows,
      stats: {
        total: rows.length,
        active: activeCount,
        inactive: rows.length - activeCount,
        paid: paidCount,
        tierCounts,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load tenants');
  }
}

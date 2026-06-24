import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type AppRegistryRow = {
  id: string;
  app_name: string;
  status: string;
  created_at: string;
};

type ListingRow = {
  id: string;
  price_cents: number;
  app_source: Record<string, unknown>;
};

type PurchaseRow = {
  listing_id: string;
};

function listingMatchesApp(listing: ListingRow, app: AppRegistryRow): boolean {
  const source = listing.app_source ?? {};
  const appName = typeof source.appName === 'string' ? source.appName : '';
  const registryId = typeof source.appRegistryId === 'string' ? source.appRegistryId : '';

  return registryId === app.id || appName.toLowerCase() === app.app_name.toLowerCase();
}

async function computeAppRevenue(
  admin: ReturnType<typeof createAdminClient>,
  apps: AppRegistryRow[]
): Promise<Record<string, number>> {
  const revenueByApp: Record<string, number> = Object.fromEntries(apps.map((a) => [a.id, 0]));

  const { data: listings } = await admin.schema('marketplace').from('listings').select('id, price_cents, app_source');
  const { data: purchases } = await admin.schema('marketplace').from('purchases').select('listing_id');

  if (!listings?.length || !purchases?.length) return revenueByApp;

  const priceByListing = new Map(
    (listings as ListingRow[]).map((l) => [l.id, l.price_cents])
  );

  const purchaseCounts = new Map<string, number>();
  for (const purchase of purchases as PurchaseRow[]) {
    purchaseCounts.set(
      purchase.listing_id,
      (purchaseCounts.get(purchase.listing_id) ?? 0) + 1
    );
  }

  for (const app of apps) {
    let cents = 0;
    for (const listing of listings as ListingRow[]) {
      if (!listingMatchesApp(listing, app)) continue;
      const count = purchaseCounts.get(listing.id) ?? 0;
      cents += count * listing.price_cents;
    }
    revenueByApp[app.id] = cents;
  }

  return revenueByApp;
}

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const status = request.nextUrl.searchParams.get('status');
    const admin = createAdminClient();

    let query = admin
      .schema('firstparty')
      .from('app_registry')
      .select('*')
      .order('created_at', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: apps, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (apps ?? []) as AppRegistryRow[];
    const revenueByApp = await computeAppRevenue(admin, rows);

    const enriched = rows.map((app) => ({
      ...app,
      revenue_cents: revenueByApp[app.id] ?? 0,
    }));

    const activeCount = rows.filter((a) => a.status === 'active').length;
    const totalRevenueCents = Object.values(revenueByApp).reduce((sum, n) => sum + n, 0);

    return NextResponse.json({
      apps: enriched,
      stats: {
        total: rows.length,
        active: activeCount,
        draft: rows.filter((a) => a.status === 'draft').length,
        inactive: rows.filter((a) => a.status === 'inactive' || a.status === 'archived').length,
        totalRevenueCents,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load apps');
  }
}

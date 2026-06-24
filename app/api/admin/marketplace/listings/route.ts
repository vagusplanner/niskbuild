import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type ListingRow = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  listing_type: string;
  seller_user_id: string | null;
  is_active: boolean;
  app_source: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const status = request.nextUrl.searchParams.get('status');
    const admin = createAdminClient();

    let query = admin
      .schema('marketplace')
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'pending') {
      query = query.eq('is_active', false);
    } else if (status === 'featured') {
      query = query.contains('app_source', { featured: true });
    }

    const { data: listings, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (listings ?? []) as ListingRow[];
    const sellerIds = [...new Set(rows.map((r) => r.seller_user_id).filter(Boolean))] as string[];

    const sellerEmailById = new Map<string, string>();
    if (sellerIds.length) {
      const { data: sellers } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', sellerIds);

      for (const seller of sellers ?? []) {
        sellerEmailById.set(seller.id, seller.email);
      }
    }

    const enriched = rows.map((listing) => ({
      ...listing,
      seller_email: listing.seller_user_id
        ? sellerEmailById.get(listing.seller_user_id) ?? 'Unknown'
        : 'Platform',
      featured: listing.app_source?.featured === true,
    }));

    const { count: purchaseCount } = await admin
      .schema('marketplace')
      .from('purchases')
      .select('*', { count: 'exact', head: true });

    const { data: salesTotal } = await admin
      .schema('marketplace')
      .rpc('sales_total_cents_this_month')
      .single();

    return NextResponse.json({
      listings: enriched,
      stats: {
        total: rows.length,
        active: rows.filter((l) => l.is_active).length,
        pending: rows.filter((l) => !l.is_active).length,
        featured: rows.filter((l) => l.app_source?.featured === true).length,
        purchases: purchaseCount ?? 0,
        salesCentsThisMonth: Number(salesTotal ?? 0),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load marketplace listings');
  }
}

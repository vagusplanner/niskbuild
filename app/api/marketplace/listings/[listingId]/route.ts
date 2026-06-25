import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { buildListingDetailResponse } from '@/lib/marketplace-service';

type RouteContext = { params: Promise<{ listingId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 60 });
  if (!guard.ok) return guard.response;

  const { listingId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = await buildListingDetailResponse(supabase, user?.id ?? null, listingId);
  if (!payload) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json(payload);
}

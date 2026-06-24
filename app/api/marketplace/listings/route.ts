import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { buildListingsResponse } from '@/lib/marketplace-service';

function parseListingsParams(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get('limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  return {
    category: searchParams.get('category'),
    search: searchParams.get('search'),
    featured: searchParams.get('featured') === 'true',
    limit: limit && Number.isFinite(limit) ? limit : undefined,
  };
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 60 });
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = await buildListingsResponse(
    supabase,
    user?.id ?? null,
    parseListingsParams(request.nextUrl.searchParams)
  );

  return NextResponse.json(payload);
}

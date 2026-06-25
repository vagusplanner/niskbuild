import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
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

/** @deprecated Use GET /api/marketplace/listings */
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

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = await buildListingsResponse(supabase, user?.id ?? null, {});
    const template = payload.templates.find((t) => t.id === id);

    if (!template) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch listing');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 60 });
  if (!guard.ok) return guard.response;

  try {
    const ref = request.nextUrl.searchParams.get('ref')?.trim();
    if (!ref) {
      return NextResponse.json({ error: 'ref is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Places API not configured' }, { status: 503 });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/photo');
    url.searchParams.set('maxwidth', '1200');
    url.searchParams.set('photo_reference', ref);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), { redirect: 'follow', next: { revalidate: 86400 } });
    if (!response.ok) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load photo');
  }
}

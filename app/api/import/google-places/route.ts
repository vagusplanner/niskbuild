import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import type {
  GooglePlacesBusiness,
  GooglePlacesSearchResult,
} from '@/lib/google-places-types';
import { logGooglePlacesImport } from '@/lib/log-google-places-import';
import { createAdminClient } from '@/lib/supabase/admin';
import { canImportGooglePlaces, isPaidAndActive } from '@/lib/tier-config';

function formatBusinessType(types?: string[]): string | undefined {
  if (!types?.length) return undefined;
  const skip = new Set(['point_of_interest', 'establishment']);
  const primary = types.find((t) => !skip.has(t));
  return (primary || types[0])?.replace(/_/g, ' ');
}

async function getProfile(userId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', userId)
    .single();
  return data;
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  const userId = guard.user!.id;

  try {
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const placeId = typeof body.placeId === 'string' ? body.placeId.trim() : '';

    const profile = await getProfile(userId);
    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canImportGooglePlaces(tier, status)) {
      return NextResponse.json(
        { error: 'Google Places import requires an active Pro plan or above.', upgrade: true },
        { status: 403 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API is not configured on the server.' },
        { status: 503 }
      );
    }

    if (action === 'search') {
      if (!query || query.length < 3) {
        return NextResponse.json({ error: 'Query must be at least 3 characters' }, { status: 400 });
      }

      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.set('query', query);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), { next: { revalidate: 0 } });
      const data = await response.json();

      if (data.status === 'ZERO_RESULTS') {
        return NextResponse.json({ places: [] });
      }

      if (data.status !== 'OK' || !Array.isArray(data.results)) {
        return NextResponse.json(
          { error: data.error_message || 'Google Places search failed' },
          { status: 502 }
        );
      }

      const places: GooglePlacesSearchResult[] = data.results.slice(0, 8).map(
        (place: Record<string, unknown>) => ({
          placeId: String(place.place_id),
          name: String(place.name || ''),
          address: String(place.formatted_address || place.vicinity || ''),
          rating: typeof place.rating === 'number' ? place.rating : undefined,
          userRatingsTotal:
            typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
          businessType: formatBusinessType(place.types as string[] | undefined),
          vicinity: typeof place.vicinity === 'string' ? place.vicinity : undefined,
        })
      );

      return NextResponse.json({ places });
    }

    if (action === 'details') {
      if (!placeId) {
        return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
      }

      const fields = [
        'name',
        'formatted_address',
        'formatted_phone_number',
        'website',
        'opening_hours',
        'rating',
        'user_ratings_total',
        'types',
        'photos',
        'reviews',
        'url',
      ].join(',');

      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.set('place_id', placeId);
      url.searchParams.set('fields', fields);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString(), { next: { revalidate: 0 } });
      const data = await response.json();

      if (data.status !== 'OK' || !data.result) {
        return NextResponse.json(
          { error: data.error_message || 'Google Places details failed' },
          { status: 502 }
        );
      }

      const place = data.result as Record<string, unknown>;
      const reviews = Array.isArray(place.reviews) ? place.reviews : [];
      const photos = Array.isArray(place.photos) ? place.photos : [];
      const openingHours = place.opening_hours as { weekday_text?: string[] } | undefined;

      const business: GooglePlacesBusiness = {
        name: String(place.name || ''),
        address: String(place.formatted_address || ''),
        phone:
          typeof place.formatted_phone_number === 'string'
            ? place.formatted_phone_number
            : undefined,
        website: typeof place.website === 'string' ? place.website : undefined,
        openingHours: openingHours?.weekday_text,
        rating: typeof place.rating === 'number' ? place.rating : undefined,
        reviewCount:
          typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
        businessType: formatBusinessType(place.types as string[] | undefined),
        photos: photos
          .slice(0, 3)
          .map((p: { photo_reference?: string }) => p.photo_reference)
          .filter(Boolean) as string[],
        description: reviews
          .slice(0, 3)
          .map((r: { text?: string }) => r.text)
          .filter(Boolean)
          .join(' '),
        googleMapsUrl: typeof place.url === 'string' ? place.url : undefined,
      };

      const sessionId =
        typeof body.sessionId === 'string' ? body.sessionId : userId;

      if (isPaidAndActive(tier, status)) {
        await logGooglePlacesImport({
          userId,
          sessionId,
          subscriptionTier: tier,
          businessName: business.name,
        });
      }

      return NextResponse.json({
        business,
        projectContext: {
          type: 'google_places',
          source: 'google_places_api',
          importedAt: new Date().toISOString(),
          business,
          raw: place,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "search" or "details".' }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to fetch business data');
  }
}

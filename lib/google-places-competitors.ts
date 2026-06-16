import 'server-only';

import type { CompetitorCandidate } from '@/lib/google-places-types';

function formatBusinessType(types?: string[]): string | undefined {
  if (!types?.length) return undefined;
  const skip = new Set(['point_of_interest', 'establishment']);
  const primary = types.find((t) => !skip.has(t));
  return (primary || types[0])?.replace(/_/g, ' ');
}

function extractLocality(address: string): string {
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2] || parts[parts.length - 1];
  return parts[0] || address;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function findNearbyCompetitors(params: {
  apiKey: string;
  excludePlaceId: string;
  businessType: string;
  address: string;
  businessName: string;
  limit?: number;
}): Promise<CompetitorCandidate[]> {
  const limit = params.limit ?? 3;
  const locality = extractLocality(params.address);
  const typeLabel = params.businessType || 'business';
  const query = `${typeLabel} in ${locality}`;

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('key', params.apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await response.json();

  if (data.status !== 'OK' || !Array.isArray(data.results)) {
    return [];
  }

  const clientNorm = normalizeName(params.businessName);

  const candidates: CompetitorCandidate[] = data.results
    .filter((place: Record<string, unknown>) => {
      const id = String(place.place_id || '');
      const name = String(place.name || '');
      if (!id || id === params.excludePlaceId) return false;
      const nameNorm = normalizeName(name);
      if (nameNorm === clientNorm || nameNorm.includes(clientNorm) || clientNorm.includes(nameNorm)) {
        return false;
      }
      return true;
    })
    .map((place: Record<string, unknown>) => ({
      placeId: String(place.place_id),
      name: String(place.name || ''),
      address: String(place.formatted_address || place.vicinity || ''),
      rating: typeof place.rating === 'number' ? place.rating : undefined,
      reviewCount:
        typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
      businessType: formatBusinessType(place.types as string[] | undefined),
    }))
    .sort((a: CompetitorCandidate, b: CompetitorCandidate) => {
      const reviewsA = a.reviewCount ?? 0;
      const reviewsB = b.reviewCount ?? 0;
      if (reviewsB !== reviewsA) return reviewsB - reviewsA;
      return (b.rating ?? 0) - (a.rating ?? 0);
    })
    .slice(0, limit);

  return candidates;
}

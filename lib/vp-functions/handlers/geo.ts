import {
  calcDistKm,
  fetchAladhanTimings,
  fetchHalalNearby,
  fetchHydrationNearby,
  fetchMosquesNearby,
  fetchOpenMeteoForecast,
  fetchQuickFoodNearby,
  formatDist,
  nominatimReverse,
  nominatimSearch,
} from '../geo-utils';
import type { VpFunctionHandler } from '../types';
import { createClient } from '@/lib/supabase/server';

async function resolveCoords(payload: Record<string, unknown>) {
  const lat =
    typeof payload.latitude === 'number'
      ? payload.latitude
      : typeof payload.lat === 'number'
        ? payload.lat
        : null;
  const lng =
    typeof payload.longitude === 'number'
      ? payload.longitude
      : typeof payload.lng === 'number'
        ? payload.lng
        : null;

  if (lat != null && lng != null) {
    return { lat, lng };
  }

  const location = typeof payload.location === 'string' ? payload.location.trim() : '';
  if (location) {
    const hit = await nominatimSearch(location);
    if (hit) return { lat: hit.lat, lng: hit.lng };
  }

  return null;
}

export const findHalalRestaurants: VpFunctionHandler = async ({ payload }) => {
  const coords = await resolveCoords(payload);
  if (!coords) {
    return { ok: false, error: 'lat/lng or location is required', status: 400 };
  }

  const query = typeof payload.query === 'string' ? payload.query.trim().toLowerCase() : '';
  const radiusKm = typeof payload.radius_km === 'number' ? payload.radius_km : 2;
  const items = await fetchHalalNearby(coords.lat, coords.lng, radiusKm * 1000, 20);

  const restaurants = items
    .filter((r) => !query || r.name.toLowerCase().includes(query) || r.cuisine.toLowerCase().includes(query))
    .map((r) => ({
      name: r.name,
      address: r.address,
      cuisine: r.cuisine,
      distance: formatDist(r.distKm),
      rating: null,
      open_now: undefined,
      phone: r.tags?.phone,
      website: r.tags?.website,
    }));

  return { ok: true, data: { restaurants } };
};

export const getHalalAndPrayerLocations: VpFunctionHandler = async ({ payload }) => {
  const coords = await resolveCoords(payload);
  if (!coords) {
    return { ok: false, error: 'latitude/longitude or location is required', status: 400 };
  }

  const radiusKm = typeof payload.radius_km === 'number' ? payload.radius_km : 2;
  const radiusM = radiusKm * 1000;

  const [mosques, halal, quickFood, hydration, prayerTimes] = await Promise.all([
    fetchMosquesNearby(coords.lat, coords.lng, Math.max(radiusM, 3000), 8),
    fetchHalalNearby(coords.lat, coords.lng, radiusM, 10),
    fetchQuickFoodNearby(coords.lat, coords.lng, radiusM, 8),
    fetchHydrationNearby(coords.lat, coords.lng, 1000, 6),
    fetchAladhanTimings(coords.lat, coords.lng),
  ]);

  const prayer_facilities = mosques.map((m) => ({
    name: m.name,
    distance_km: Number(m.distKm.toFixed(1)),
    type: 'mosque',
    prayer_times: prayerTimes ?? undefined,
    facilities: ['prayer_room', 'wudu'],
    current_congestion: 'moderate',
    accessibility: m.tags?.wheelchair === 'yes' ? 'Wheelchair accessible' : undefined,
  }));

  const halal_restaurants = halal.map((r) => ({
    name: r.name,
    distance_km: Number(r.distKm.toFixed(1)),
    cuisine_type: r.cuisine || 'Halal',
    price_range: '££',
    ratings: '4.0',
    halal_certification: r.halal ? 'Halal tagged' : undefined,
    specialties: r.cuisine ? [r.cuisine] : [],
    dietary_options: ['Halal'],
    why_recommended: r.halal ? 'Verified halal tag on OpenStreetMap' : 'Nearby dining option',
  }));

  const quick_food_stalls = quickFood.map((s) => ({
    name: s!.name,
    distance_km: Number(s!.distKm.toFixed(1)),
    specialty: s!.specialty,
    popular_items: s!.popular_items,
    price: s!.price,
  }));

  const hydration_points = hydration.map((p) => ({
    location: p!.location,
    distance_km: Number(p!.distKm.toFixed(1)),
    type: p!.type,
    availability: p!.availability,
  }));

  return {
    ok: true,
    data: {
      prayer_facilities,
      halal_restaurants,
      quick_food_stalls,
      hydration_points,
      recommendations: {
        best_prayer_time: prayerTimes?.Dhuhr ?? 'Check local times',
        best_meal_option: halal_restaurants[0]?.name ?? 'Explore nearby halal options',
        hydration_strategy: 'Stay hydrated — locate water fountains nearby',
      },
    },
  };
};

export const getWeatherForecast: VpFunctionHandler = async ({ payload }) => {
  const lat =
    typeof payload.latitude === 'number'
      ? payload.latitude
      : typeof payload.lat === 'number'
        ? payload.lat
        : null;
  const lon =
    typeof payload.longitude === 'number'
      ? payload.longitude
      : typeof payload.lon === 'number'
        ? payload.lon
        : null;
  const date =
    typeof payload.date === 'string'
      ? payload.date
      : new Date().toISOString().split('T')[0];

  if (lat == null || lon == null) {
    return { ok: false, error: 'latitude and longitude are required', status: 400 };
  }

  try {
    const forecast = await fetchOpenMeteoForecast(lat, lon, date);
    return { ok: true, data: forecast };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Weather fetch failed';
    return { ok: false, error: message, status: 502 };
  }
};

async function resolveClientIp(request: import('next/server').NextRequest): Promise<string | null> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  if (!ip || ip === 'unknown') return null;
  return ip;
}

export const detectUserLocation: VpFunctionHandler = async ({ request, user, payload }) => {
  let lat =
    typeof payload.latitude === 'number'
      ? payload.latitude
      : typeof payload.lat === 'number'
        ? payload.lat
        : null;
  let lng =
    typeof payload.longitude === 'number'
      ? payload.longitude
      : typeof payload.lng === 'number'
        ? payload.lng
        : null;

  if (lat == null || lng == null) {
    const vercelLat = request.headers.get('x-vercel-ip-latitude');
    const vercelLng = request.headers.get('x-vercel-ip-longitude');
    if (vercelLat && vercelLng) {
      lat = parseFloat(vercelLat);
      lng = parseFloat(vercelLng);
    }
  }

  if (lat == null || lng == null) {
    const ip = await resolveClientIp(request);
    if (ip) {
      try {
        const res = await fetch(`http://ip-api.com/json/${ip}?fields=lat,lon,city,country,timezone`);
        const geo = (await res.json()) as {
          lat?: number;
          lon?: number;
          city?: string;
          country?: string;
          timezone?: string;
        };
        if (geo.lat != null && geo.lon != null) {
          lat = geo.lat;
          lng = geo.lon;
        }
      } catch {
        // fall through
      }
    }
  }

  if (lat == null || lng == null) {
    return {
      ok: false,
      error: 'Could not detect location — pass latitude/longitude in payload',
      status: 400,
    };
  }

  const geo = await nominatimReverse(lat, lng);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select('id, preferences')
    .eq('user_id', user.id)
    .maybeSingle();

  const preferences = {
    ...((existing?.preferences as Record<string, unknown>) ?? {}),
    city: geo.city,
    country: geo.country,
    latitude: geo.latitude,
    longitude: geo.longitude,
    timezone: geo.timezone,
  };

  if (existing?.id) {
    await supabase
      .schema('firstparty')
      .from('vp_user_settings')
      .update({ preferences, timezone: geo.timezone, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.schema('firstparty').from('vp_user_settings').insert({
      user_id: user.id,
      preferences,
      timezone: geo.timezone,
    });
  }

  return {
    ok: true,
    data: {
      city: geo.city,
      country: geo.country,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      location: { city: geo.city, country: geo.country },
    },
  };
};

export const fetchPublicHolidays: VpFunctionHandler = async ({ payload }) => {
  const countryCode =
    typeof payload.countryCode === 'string' ? payload.countryCode.toUpperCase() : '';
  const year =
    typeof payload.year === 'number'
      ? payload.year
      : parseInt(String(payload.year ?? new Date().getFullYear()), 10);

  if (!countryCode || countryCode.length !== 2) {
    return { ok: false, error: 'countryCode is required (ISO 3166-1 alpha-2)', status: 400 };
  }

  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
  if (!res.ok) {
    return { ok: false, error: 'Failed to fetch public holidays', status: 502 };
  }

  const rows = (await res.json()) as Array<{
    date: string;
    localName: string;
    name: string;
    countryCode: string;
  }>;

  const holidays = rows.map((h) => ({
    date: h.date,
    name: h.name,
    localName: h.localName,
    countryCode: h.countryCode,
  }));

  return { ok: true, data: { holidays } };
};

const PRAYER_METHOD_NUM: Record<string, number> = {
  MWL: 3,
  ISNA: 2,
  Egypt: 5,
  Makkah: 4,
  Karachi: 1,
  Tehran: 7,
  Jafari: 0,
};

/** Today's prayer times for the signed-in user's saved location (PrayerNotificationManager). */
export const getPrayerTimesForUser: VpFunctionHandler = async ({ user }) => {
  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .schema('firstparty')
    .from('vp_user_settings')
    .select('preferences, timezone')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'Failed to load user settings', status: 500 };
  }

  const prefs =
    settings?.preferences && typeof settings.preferences === 'object' && !Array.isArray(settings.preferences)
      ? (settings.preferences as Record<string, unknown>)
      : {};

  const lat =
    typeof prefs.latitude === 'number'
      ? prefs.latitude
      : typeof prefs.lat === 'number'
        ? prefs.lat
        : null;
  const lng =
    typeof prefs.longitude === 'number'
      ? prefs.longitude
      : typeof prefs.lng === 'number'
        ? prefs.lng
        : null;

  if (lat == null || lng == null) {
    return { ok: false, error: 'Location not set — update Settings', status: 400 };
  }

  const methodKey =
    typeof prefs.prayer_method === 'string' ? prefs.prayer_method : 'MWL';
  const methodNum = PRAYER_METHOD_NUM[methodKey] ?? 3;
  const day = new Date().toISOString().split('T')[0];

  const timings = await fetchAladhanTimings(lat, lng, day);
  if (!timings) {
    return { ok: false, error: 'Could not calculate prayer times', status: 502 };
  }

  const city =
    typeof prefs.location_city === 'string'
      ? prefs.location_city
      : typeof prefs.city === 'string'
        ? prefs.city
        : 'Your location';
  const country = typeof prefs.location_country === 'string' ? prefs.location_country : '';

  return {
    ok: true,
    data: {
      prayers: {
        Fajr: timings.Fajr,
        Sunrise: timings.Fajr,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      },
      location: { city, country },
      method: methodKey,
      timezone: settings?.timezone ?? 'UTC',
    },
  };
};

export function calcDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDist(km: number | null | undefined): string {
  if (km === null || km === undefined) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export async function nominatimReverse(lat: number, lng: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'NiskBuild-VagusPlanner/1.0' } }
  );
  if (!res.ok) throw new Error('Reverse geocode failed');
  const data = (await res.json()) as {
    address?: Record<string, string>;
    lat?: string;
    lon?: string;
  };
  const addr = data.address ?? {};
  return {
    city:
      addr.city ||
      addr.town ||
      addr.village ||
      addr.county ||
      'Unknown',
    country: addr.country || '',
    countryCode: (addr.country_code || '').toUpperCase(),
    latitude: parseFloat(data.lat ?? String(lat)),
    longitude: parseFloat(data.lon ?? String(lng)),
    timezone: addr.timezone || 'UTC',
  };
}

export async function nominatimSearch(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'NiskBuild-VagusPlanner/1.0' } }
  );
  if (!res.ok) throw new Error('Location search failed');
  const results = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const hit = results[0];
  if (!hit) return null;
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  const geo = await nominatimReverse(lat, lng);
  return { lat, lng, ...geo, displayName: hit.display_name };
}

export async function fetchAladhanTimings(lat: number, lng: number, date?: string) {
  const day = date || new Date().toISOString().split('T')[0];
  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${day}?latitude=${lat}&longitude=${lng}&method=2`
  );
  const data = (await res.json()) as { code?: number; data?: { timings?: Record<string, string> } };
  if (data.code !== 200 || !data.data?.timings) return null;
  const t = data.data.timings;
  return {
    Fajr: t.Fajr,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
  };
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function overpassQuery(query: string) {
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: query,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NiskBuild-VP/1.0',
    },
  });
  if (!res.ok) throw new Error('Overpass query failed');
  const data = (await res.json()) as { elements?: Array<Record<string, unknown>> };
  return data.elements ?? [];
}

export async function fetchMosquesNearby(lat: number, lng: number, radiusM = 5000, limit = 12) {
  const query = `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng}););out center ${limit};`;
  const elements = await overpassQuery(query);
  return elements
    .map((el) => {
      const tags = (el.tags as Record<string, string>) || {};
      const elLat = (el.lat as number) || (el.center as { lat?: number })?.lat;
      const elLng = (el.lon as number) || (el.center as { lon?: number })?.lon;
      if (elLat == null || elLng == null) return null;
      const distKm = calcDistKm(lat, lng, elLat, elLng);
      return {
        id: el.id,
        name: tags.name || tags['name:en'] || 'Mosque',
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
        distKm,
        lat: elLat,
        lng: elLng,
        tags,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.distKm ?? 0) - (b!.distKm ?? 0))
    .slice(0, limit) as Array<{
    id: unknown;
    name: string;
    address: string;
    distKm: number;
    lat: number;
    lng: number;
    tags: Record<string, string>;
  }>;
}

export async function fetchHalalNearby(lat: number, lng: number, radiusM = 2000, limit = 15) {
  const query = `[out:json][timeout:15];(node["diet:halal"="yes"](around:${radiusM},${lat},${lng});node["amenity"~"restaurant|cafe|fast_food"]["diet:halal"!="no"](around:${Math.round(radiusM * 0.75)},${lat},${lng}););out ${limit};`;
  const elements = await overpassQuery(query);
  return elements
    .map((el) => {
      const tags = (el.tags as Record<string, string>) || {};
      const elLat = el.lat as number;
      const elLng = el.lon as number;
      if (elLat == null || elLng == null) return null;
      const distKm = calcDistKm(lat, lng, elLat, elLng);
      return {
        id: el.id,
        name: tags.name || 'Halal Restaurant',
        cuisine: tags.cuisine || '',
        address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
          .filter(Boolean)
          .join(' '),
        distKm,
        halal: tags['diet:halal'] === 'yes',
        tags,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.distKm ?? 0) - (b!.distKm ?? 0))
    .slice(0, limit) as Array<{
    id: unknown;
    name: string;
    cuisine: string;
    address: string;
    distKm: number;
    halal: boolean;
    tags: Record<string, string>;
  }>;
}

export async function fetchQuickFoodNearby(lat: number, lng: number, radiusM = 1500, limit = 10) {
  const query = `[out:json][timeout:15];node["amenity"="fast_food"](around:${radiusM},${lat},${lng});out ${limit};`;
  const elements = await overpassQuery(query);
  return elements
    .map((el) => {
      const tags = (el.tags as Record<string, string>) || {};
      const elLat = el.lat as number;
      const elLng = el.lon as number;
      if (elLat == null || elLng == null) return null;
      return {
        name: tags.name || 'Food Stall',
        distKm: calcDistKm(lat, lng, elLat, elLng),
        specialty: tags.cuisine || tags['cuisine:en'] || 'Fast food',
        popular_items: tags['diet:halal'] === 'yes' ? ['Halal options'] : [],
        price: tags['fee'] ? 'Paid' : '£',
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

export async function fetchHydrationNearby(lat: number, lng: number, radiusM = 1000, limit = 8) {
  const query = `[out:json][timeout:15];node["amenity"="drinking_water"](around:${radiusM},${lat},${lng});out ${limit};`;
  const elements = await overpassQuery(query);
  return elements
    .map((el) => {
      const tags = (el.tags as Record<string, string>) || {};
      const elLat = el.lat as number;
      const elLng = el.lon as number;
      if (elLat == null || elLng == null) return null;
      return {
        location: tags.name || 'Water fountain',
        distKm: calcDistKm(lat, lng, elLat, elLng),
        type: tags.fountain || 'public',
        availability: '24/7',
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

const WEATHER_CODES: Record<number, { icon: string; description: string }> = {
  0: { icon: '☀️', description: 'Clear sky' },
  1: { icon: '🌤️', description: 'Mainly clear' },
  2: { icon: '⛅', description: 'Partly cloudy' },
  3: { icon: '☁️', description: 'Overcast' },
  45: { icon: '🌫️', description: 'Foggy' },
  48: { icon: '🌫️', description: 'Icy fog' },
  51: { icon: '🌦️', description: 'Light drizzle' },
  53: { icon: '🌦️', description: 'Drizzle' },
  55: { icon: '🌧️', description: 'Heavy drizzle' },
  61: { icon: '🌧️', description: 'Light rain' },
  63: { icon: '🌧️', description: 'Rain' },
  65: { icon: '🌧️', description: 'Heavy rain' },
  71: { icon: '🌨️', description: 'Light snow' },
  73: { icon: '❄️', description: 'Snow' },
  75: { icon: '❄️', description: 'Heavy snow' },
  80: { icon: '🌦️', description: 'Rain showers' },
  95: { icon: '⛈️', description: 'Thunderstorm' },
};

export async function fetchOpenMeteoForecast(lat: number, lon: number, date: string) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', date);
  url.searchParams.set('end_date', date);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Weather fetch failed');
  const data = (await res.json()) as {
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
    };
  };

  const daily = data.daily;
  if (!daily?.time?.length) throw new Error('No forecast data');

  const code = daily.weather_code?.[0] ?? 0;
  const meta = WEATHER_CODES[code] ?? { icon: '🌡️', description: 'Unknown' };
  const tMin = Math.round(daily.temperature_2m_min?.[0] ?? 0);
  const tMax = Math.round(daily.temperature_2m_max?.[0] ?? 0);

  return {
    icon: meta.icon,
    description: meta.description,
    temperature_min: tMin,
    temperature_max: tMax,
    unit: 'C',
    precipitation_probability: daily.precipitation_probability_max?.[0] ?? 0,
  };
}

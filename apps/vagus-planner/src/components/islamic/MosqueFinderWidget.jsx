import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { fetchOverpass } from '@/lib/overpass-client';

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDist(m) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

async function fetchNearbyMosques(lat, lng, radiusM = 3000) {
  const query = `[out:json][timeout:25];
    (
      node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
      way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${lat},${lng});
    );
    out body center;`;

  const data = await fetchOverpass(query);

  return (data.elements || [])
    .map((el) => ({
      id: el.id,
      name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ar'] || 'Mosque',
      address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', '),
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
    }))
    .filter((m) => m.lat && m.lng)
    .map((m) => ({ ...m, distM: distM(lat, lng, m.lat, m.lng) }))
    .sort((a, b) => a.distM - b.distM)
    .slice(0, 8);
}

export default function MosqueFinderWidget() {
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const findNearbyMosques = () => {
    setLoading(true);
    setLoadError(null);

    if (!('geolocation' in navigator)) {
      setLoading(false);
      setLoadError('Geolocation is not supported on this device.');
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setLocation(loc);

        try {
          const items = await fetchNearbyMosques(latitude, longitude);
          setMosques(items);
          if (items.length === 0) {
            setLoadError('No mosques found within 3 km. Try the full map for a wider search.');
            toast.info('No mosques found nearby');
          } else {
            toast.success(`Found ${items.length} mosque${items.length === 1 ? '' : 's'} nearby`);
          }
        } catch {
          setMosques([]);
          setLoadError('Unable to load nearby mosques. Please try again or use the full map.');
          toast.error('Could not load mosques');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setLoadError('Location access denied. Enable location permission to find nearby mosques.');
        toast.error('Could not get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openDirections = (mosque) => {
    if (mosque.lat && mosque.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Nearby Mosques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mosques.length === 0 ? (
          <div className="text-center space-y-4 py-8">
            <MapPin className="w-12 h-12 mx-auto text-green-600" />
            <p className="text-sm text-slate-600">
              Find real mosques near you via OpenStreetMap (within 3 km)
            </p>
            {loadError && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {loadError}
              </p>
            )}
            <Button
              onClick={findNearbyMosques}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Navigation className="w-4 h-4 mr-2" />
              )}
              Find Mosques
            </Button>
            <Link
              to={createPageUrl('MosqueMap')}
              className="block text-xs text-green-700 hover:underline font-medium"
            >
              Open full mosque map →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {mosques.map((mosque) => (
              <div
                key={mosque.id}
                className="p-4 bg-white rounded-lg border border-green-200 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{mosque.name}</h4>
                    {mosque.address ? (
                      <p className="text-sm text-slate-600">{mosque.address}</p>
                    ) : null}
                    <span className="text-xs text-green-600 font-medium">{formatDist(mosque.distM)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDirections(mosque)}
                    className="ml-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button onClick={findNearbyMosques} variant="outline" size="sm" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
            <Link
              to={createPageUrl('MosqueMap')}
              className="block text-center text-xs text-green-700 hover:underline font-medium"
            >
              View on full map →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

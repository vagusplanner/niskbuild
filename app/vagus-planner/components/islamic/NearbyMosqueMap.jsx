/**
 * GPS-based Nearby Mosque Finder with interactive map and prayer times.
 * Uses OpenStreetMap Overpass API (free, no key needed) + react-leaflet.
 * Integrated as a new tab in PrayerAndQiblaPanel.
 */
import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, Navigation, Clock, Phone, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchPrayerTimes } from './prayerEngine';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDist(m) {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function to12h(t24) {
  if (!t24) return '--:--';
  const [h, m] = t24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function NearbyMosqueMap() {
  const [location, setLocation] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const settings = settingsList[0];

  // Auto-use saved coords
  useEffect(() => {
    if (settings?.latitude && settings?.longitude) {
      const loc = { lat: settings.latitude, lng: settings.longitude };
      setLocation(loc);
      fetchMosques(loc);
      loadPrayerTimes(loc);
    }
  }, [settings]);

  const loadPrayerTimes = async ({ lat, lng }) => {
    const times = await fetchPrayerTimes(new Date(), lat, lng, settings?.prayer_method || 'MWL', '0', {});
    setPrayerTimes(times);
  };

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setLocation(loc);
        fetchMosques(loc);
        loadPrayerTimes(loc);
        setLoading(false);
      },
      () => { setLoading(false); toast.error('Could not access location'); },
      { enableHighAccuracy: true }
    );
  };

  const fetchMosques = async ({ lat, lng }) => {
    setLoading(true);
    try {
      // Overpass API — finds mosques within 3km
      const query = `[out:json][timeout:25];
        (
          node["amenity"="place_of_worship"]["religion"="muslim"](around:3000,${lat},${lng});
          way["amenity"="place_of_worship"]["religion"="muslim"](around:3000,${lat},${lng});
        );
        out body center;`;

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });
      const data = await res.json();

      const items = (data.elements || [])
        .map(el => ({
          id: el.id,
          name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ar'] || 'Mosque',
          nameAr: el.tags?.['name:ar'] || el.tags?.name || '',
          lat: el.lat || el.center?.lat,
          lng: el.lon || el.center?.lon,
          phone: el.tags?.phone || el.tags?.['contact:phone'],
          website: el.tags?.website || el.tags?.['contact:website'],
          opening: el.tags?.opening_hours,
          operator: el.tags?.operator,
        }))
        .filter(m => m.lat && m.lng)
        .map(m => ({ ...m, dist: distM(lat, lng, m.lat, m.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 12);

      setMosques(items);
      if (items.length === 0) toast.info('No mosques found nearby — try a wider area');
    } catch (e) {
      toast.error('Could not load mosques');
    }
    setLoading(false);
  };

  // Lazy load leaflet only when needed
  const [LeafletMap, setLeafletMap] = useState(null);
  useEffect(() => {
    if (location && !LeafletMap) {
      import('react-leaflet').then(({ MapContainer, TileLayer, Marker, Popup, Circle }) => {
        import('leaflet').then(L => {
          // Fix default icon
          delete L.default.Icon.Default.prototype._getIconUrl;
          L.default.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
          setLeafletMap({ MapContainer, TileLayer, Marker, Popup, Circle, L: L.default });
          setMapReady(true);
        });
      });
    }
  }, [location]);

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-xl">
            <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Nearby Mosques</p>
            {location && <p className="text-xs text-slate-400">{mosques.length} found within 3km</p>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={getLocation} disabled={loading}
          className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3 mr-1" />}
          {loading ? '' : location ? 'Refresh' : 'Find Mosques'}
        </Button>
      </div>

      {/* Prayer Times Strip */}
      {prayerTimes && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {PRAYER_NAMES.map(p => (
            <div key={p} className="flex-shrink-0 text-center bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5 min-w-[68px]">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{p}</p>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{to12h(prayerTimes[p])}</p>
            </div>
          ))}
        </div>
      )}

      {!location && !loading && (
        <div className="text-center py-8 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-teal-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Find mosques near you with GPS-accurate prayer times</p>
          <Button onClick={getLocation} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Navigation className="w-4 h-4 mr-2" /> Enable Location
          </Button>
        </div>
      )}

      {/* Map */}
      {mapReady && LeafletMap && location && mosques.length > 0 && (
        <div className="rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800" style={{ height: '220px' }}>
          <LeafletMap.MapContainer
            center={[location.lat, location.lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <LeafletMap.TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* User location circle */}
            <LeafletMap.Circle center={[location.lat, location.lng]} radius={50} pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 0.3 }} />
            {mosques.map(m => (
              <LeafletMap.Marker key={m.id} position={[m.lat, m.lng]}>
                <LeafletMap.Popup>
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs text-gray-500">{formatDist(m.dist)} away</div>
                </LeafletMap.Popup>
              </LeafletMap.Marker>
            ))}
          </LeafletMap.MapContainer>
        </div>
      )}

      {/* Mosque list */}
      {mosques.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {mosques.map(m => (
            <button key={m.id} onClick={() => setSelected(selected?.id === m.id ? null : m)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === m.id ? 'border-teal-400 bg-teal-50 dark:bg-teal-950/30' : 'border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-800 bg-white dark:bg-slate-900'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                  {m.nameAr && m.nameAr !== m.name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-right" dir="rtl">{m.nameAr}</p>
                  )}
                </div>
                <Badge className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs flex-shrink-0">
                  {formatDist(m.dist)}
                </Badge>
              </div>
              {selected?.id === m.id && (
                <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-800 flex flex-wrap gap-2">
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <Phone className="w-3 h-3" /> {m.phone}
                    </a>
                  )}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline">
                    <Navigation className="w-3 h-3" /> Directions
                  </a>
                  {m.website && (
                    <a href={m.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
                      <ExternalLink className="w-3 h-3" /> Website
                    </a>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
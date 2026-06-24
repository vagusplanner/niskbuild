import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, addMinutes, parseISO } from 'date-fns';
import {
  MapPin, Moon, Clock, Utensils, Sparkles, Loader2,
  Navigation, ChevronDown, ChevronUp, Search, Calendar,
  RefreshCw, Star, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import L from 'leaflet';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const mosqueIcon = L.divIcon({
  html: `<div style="background:#E8B84B;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🕌</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const halalIcon = L.divIcon({
  html: `<div style="background:#3ecfa0;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🍽️</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], 13); }, [lat, lng]);
  return null;
}

const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_EMOJIS = { Fajr: '🌅', Sunrise: '🌄', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

const TABS = [
  { id: 'map', label: 'Halal Map', icon: MapPin },
  { id: 'prayer', label: 'Prayer Times', icon: Moon },
  { id: 'itinerary', label: 'AI Itinerary', icon: Calendar },
];

export default function IslamicTravelDashboard() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [destination, setDestination] = useState('');
  const [coords, setCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [mosques, setMosques] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerDate, setPrayerDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [itinerary, setItinerary] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [tripDays, setTripDays] = useState(3);
  const [tripStyle, setTripStyle] = useState('balanced');

  // Geocode destination
  const geocodeDestination = useCallback(async () => {
    if (!destination.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) { toast.error('Destination not found'); return; }
      const { lat, lon, display_name } = data[0];
      setCoords({ lat: parseFloat(lat), lng: parseFloat(lon), display_name });
      toast.success(`📍 Found: ${display_name.split(',').slice(0, 2).join(',')}`);
    } catch {
      toast.error('Geocoding failed');
    }
    setGeocoding(false);
  }, [destination]);

  // Fetch mosques + halal restaurants via Overpass API
  const fetchMapData = useCallback(async () => {
    if (!coords) return;
    setMapLoading(true);
    const { lat, lng } = coords;
    const radius = 5000; // 5km
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
        way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
        node["amenity"="restaurant"]["diet:halal"="yes"](around:${radius},${lat},${lng});
        node["amenity"="fast_food"]["diet:halal"="yes"](around:${radius},${lat},${lng});
        node["cuisine"~"halal"](around:${radius},${lat},${lng});
      );
      out center;
    `;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain' },
      });
      const data = await res.json();
      const elements = data.elements || [];

      const m = [], r = [];
      elements.forEach(el => {
        const elLat = el.lat ?? el.center?.lat;
        const elLng = el.lon ?? el.center?.lon;
        if (!elLat || !elLng) return;
        const name = el.tags?.name || el.tags?.['name:en'] || 'Unnamed';
        const amenity = el.tags?.amenity;
        if (amenity === 'place_of_worship') {
          m.push({ lat: elLat, lng: elLng, name, address: el.tags?.['addr:street'] || '' });
        } else {
          r.push({ lat: elLat, lng: elLng, name, cuisine: el.tags?.cuisine || 'Halal', address: el.tags?.['addr:street'] || '' });
        }
      });
      setMosques(m);
      setRestaurants(r);
      if (!m.length && !r.length) toast.info('No results found in 5km radius — try a city name');
    } catch {
      toast.error('Failed to load map data');
    }
    setMapLoading(false);
  }, [coords]);

  // Fetch prayer times via Aladhan API
  const fetchPrayerTimes = useCallback(async () => {
    if (!coords) return;
    setPrayerLoading(true);
    try {
      const { lat, lng } = coords;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${prayerDate}?latitude=${lat}&longitude=${lng}&method=2`
      );
      const data = await res.json();
      if (data.code === 200) {
        setPrayerTimes(data.data);
      } else {
        toast.error('Failed to fetch prayer times');
      }
    } catch {
      toast.error('Prayer times unavailable');
    }
    setPrayerLoading(false);
  }, [coords, prayerDate]);

  // Auto-fetch when coords change
  useEffect(() => {
    if (coords) {
      fetchMapData();
      fetchPrayerTimes();
    }
  }, [coords]);

  useEffect(() => {
    if (coords) fetchPrayerTimes();
  }, [prayerDate]);

  // Generate AI itinerary with prayer breaks
  const generateItinerary = async () => {
    if (!coords || !prayerTimes) {
      toast.error('Please set a destination and load prayer times first');
      return;
    }
    setItineraryLoading(true);
    try {
      const timings = prayerTimes.timings;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a detailed ${tripDays}-day Islamic travel itinerary for ${destination} (${coords.display_name?.split(',').slice(0, 2).join(',') || destination}).

Travel style: ${tripStyle}
Prayer times for the destination:
- Fajr: ${timings.Fajr}
- Dhuhr: ${timings.Dhuhr}  
- Asr: ${timings.Asr}
- Maghrib: ${timings.Maghrib}
- Isha: ${timings.Isha}

Requirements:
1. Include specific prayer breaks at the correct prayer times each day
2. Schedule activities between prayer times
3. Include halal restaurant recommendations for meals
4. Include mosque visits where appropriate
5. Make activities culturally respectful and Muslim-friendly
6. Include early morning Fajr activity suggestions

Return a structured day-by-day plan.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overview: { type: 'string' },
            days: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'number' },
                  theme: { type: 'string' },
                  schedule: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        time: { type: 'string' },
                        activity: { type: 'string' },
                        type: { type: 'string', description: 'prayer|food|sightseeing|rest|travel' },
                        duration_mins: { type: 'number' },
                        notes: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            halal_tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setItinerary(result);
      toast.success('✨ Itinerary with prayer breaks ready!');
    } catch {
      toast.error('Failed to generate itinerary');
    }
    setItineraryLoading(false);
  };

  const TYPE_COLORS = {
    prayer: 'bg-amber-100 text-amber-800 border-amber-300',
    food: 'bg-green-100 text-green-800 border-green-300',
    sightseeing: 'bg-blue-100 text-blue-800 border-blue-300',
    rest: 'bg-slate-100 text-slate-600 border-slate-200',
    travel: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-3xl overflow-hidden">
      {/* Header toggle */}
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🕌</span>
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-black text-white">Islamic Travel Assistant</p>
          <p className="text-[11px] text-white/40">Halal map · Prayer times · AI itinerary with prayer breaks</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="p-5 space-y-4">

              {/* Destination search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && geocodeDestination()}
                    placeholder="Enter destination (e.g. Istanbul, Dubai, London…)"
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                <Button onClick={geocodeDestination} disabled={geocoding || !destination.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1 flex-shrink-0">
                  {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {geocoding ? 'Finding…' : 'Search'}
                </Button>
              </div>

              {coords && (
                <p className="text-[11px] text-teal-400/70 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {coords.display_name?.split(',').slice(0, 3).join(', ')}
                </p>
              )}

              {/* Tabs */}
              {coords && (
                <>
                  <div className="flex gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
                    {TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all',
                            activeTab === tab.id ? 'bg-amber-400 text-[#071224]' : 'text-white/40 hover:text-white'
                          )}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* MAP TAB */}
                  {activeTab === 'map' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1">🕌 <span className="text-amber-400 font-bold">{mosques.length}</span> mosques</span>
                          <span className="flex items-center gap-1">🍽️ <span className="text-teal-400 font-bold">{restaurants.length}</span> halal spots</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={fetchMapData} disabled={mapLoading}
                          className="border-white/15 text-white/60 hover:text-white bg-transparent h-7 text-xs gap-1">
                          {mapLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Refresh
                        </Button>
                      </div>

                      {mapLoading ? (
                        <div className="h-64 flex items-center justify-center bg-white/[0.02] rounded-2xl border border-white/8">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-2" />
                            <p className="text-sm text-white/40">Loading map data…</p>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 380 }}>
                          <MapContainer
                            center={[coords.lat, coords.lng]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='&copy; OpenStreetMap contributors'
                            />
                            <MapRecenter lat={coords.lat} lng={coords.lng} />
                            {/* Destination pin */}
                            <Marker position={[coords.lat, coords.lng]}>
                              <Popup>📍 {destination}</Popup>
                            </Marker>
                            {mosques.map((m, i) => (
                              <Marker key={`m-${i}`} position={[m.lat, m.lng]} icon={mosqueIcon}>
                                <Popup>
                                  <strong>🕌 {m.name}</strong>
                                  {m.address && <><br />{m.address}</>}
                                </Popup>
                              </Marker>
                            ))}
                            {restaurants.map((r, i) => (
                              <Marker key={`r-${i}`} position={[r.lat, r.lng]} icon={halalIcon}>
                                <Popup>
                                  <strong>🍽️ {r.name}</strong>
                                  {r.cuisine && <><br />{r.cuisine}</>}
                                  {r.address && <><br />{r.address}</>}
                                </Popup>
                              </Marker>
                            ))}
                          </MapContainer>
                        </div>
                      )}

                      <p className="text-[10px] text-white/25 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Data from OpenStreetMap within 5km of destination. Tap markers for details.
                      </p>
                    </div>
                  )}

                  {/* PRAYER TIMES TAB */}
                  {activeTab === 'prayer' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={prayerDate}
                          onChange={e => setPrayerDate(e.target.value)}
                          className="bg-white/5 border border-white/20 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400/50"
                        />
                        <Button size="sm" onClick={fetchPrayerTimes} disabled={prayerLoading}
                          className="bg-amber-500 hover:bg-amber-600 text-[#071224] font-bold gap-1">
                          {prayerLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Update
                        </Button>
                      </div>

                      {prayerLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                        </div>
                      ) : prayerTimes ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-amber-400/8 border border-amber-400/15 rounded-xl">
                            <p className="text-xs text-amber-400/70 font-bold">
                              {prayerTimes.meta?.timezone || destination} · {prayerDate}
                            </p>
                            <p className="text-[10px] text-white/30 mt-0.5">Method: {prayerTimes.meta?.method?.name || 'ISNA'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {PRAYER_NAMES.map(name => {
                              const time = prayerTimes.timings[name];
                              return (
                                <div key={name} className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/8 rounded-xl">
                                  <span className="text-lg">{PRAYER_EMOJIS[name]}</span>
                                  <div>
                                    <p className="text-xs font-black text-amber-300">{name}</p>
                                    <p className="text-sm font-mono text-white">{time}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Qibla direction */}
                          {prayerTimes.meta?.latitude && (
                            <div className="p-3 bg-teal-400/8 border border-teal-400/15 rounded-xl flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-teal-400" />
                              <div>
                                <p className="text-xs font-bold text-teal-400">Coordinates</p>
                                <p className="text-xs text-white/50">
                                  {parseFloat(prayerTimes.meta.latitude).toFixed(4)}°N, {parseFloat(prayerTimes.meta.longitude).toFixed(4)}°E · Timezone: {prayerTimes.meta.timezone}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-white/30 text-sm">
                          Click Update to fetch prayer times for this destination
                        </div>
                      )}
                    </div>
                  )}

                  {/* ITINERARY TAB */}
                  {activeTab === 'itinerary' && (
                    <div className="space-y-4">
                      {/* Config */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5">Days</label>
                          <select value={tripDays} onChange={e => setTripDays(parseInt(e.target.value))}
                            className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
                            {[1,2,3,4,5,6,7].map(d => <option key={d} value={d} className="bg-[#071224]">{d} day{d > 1 ? 's' : ''}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest block mb-1.5">Style</label>
                          <select value={tripStyle} onChange={e => setTripStyle(e.target.value)}
                            className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
                            <option value="balanced" className="bg-[#071224]">Balanced</option>
                            <option value="relaxed" className="bg-[#071224]">Relaxed</option>
                            <option value="packed" className="bg-[#071224]">Packed</option>
                            <option value="spiritual" className="bg-[#071224]">Spiritual Focus</option>
                            <option value="family" className="bg-[#071224]">Family-Friendly</option>
                          </select>
                        </div>
                      </div>

                      {!prayerTimes && (
                        <p className="text-xs text-amber-400/70 flex items-center gap-1.5 p-2 bg-amber-400/8 rounded-xl border border-amber-400/15">
                          <Info className="w-3.5 h-3.5" />
                          Switch to Prayer Times tab first to load times, then come back here.
                        </p>
                      )}

                      <Button onClick={generateItinerary} disabled={itineraryLoading || !prayerTimes}
                        className="w-full bg-gradient-to-r from-amber-500 to-teal-500 text-white font-bold h-10 gap-2 hover:opacity-90">
                        {itineraryLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating itinerary…</>
                          : <><Sparkles className="w-4 h-4" /> Generate {tripDays}-Day Islamic Itinerary</>
                        }
                      </Button>

                      {itinerary && (
                        <div className="space-y-4">
                          {itinerary.overview && (
                            <div className="p-3 bg-amber-400/8 border border-amber-400/15 rounded-xl">
                              <p className="text-xs text-white/70 leading-relaxed">{itinerary.overview}</p>
                            </div>
                          )}

                          {itinerary.days?.map(day => (
                            <div key={day.day} className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
                              <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/8 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black bg-amber-400 text-[#071224] px-2 py-0.5 rounded-full">Day {day.day}</span>
                                  <span className="text-sm font-bold text-white">{day.theme}</span>
                                </div>
                              </div>
                              <div className="p-3 space-y-2">
                                {day.schedule?.map((item, i) => (
                                  <div key={i} className={cn(
                                    'flex items-start gap-3 p-2.5 rounded-xl border text-xs',
                                    TYPE_COLORS[item.type] || 'bg-white/5 border-white/10 text-white/70'
                                  )}>
                                    <span className="font-mono font-bold flex-shrink-0 w-12 text-right">{item.time}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold leading-tight">{item.activity}</p>
                                      {item.notes && <p className="mt-0.5 opacity-75 leading-relaxed">{item.notes}</p>}
                                    </div>
                                    {item.duration_mins && (
                                      <span className="flex-shrink-0 opacity-60">{item.duration_mins}m</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {itinerary.halal_tips?.length > 0 && (
                            <div className="p-4 bg-teal-400/8 border border-teal-400/15 rounded-2xl">
                              <p className="text-xs font-black text-teal-400 mb-2 flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5" /> Halal Travel Tips
                              </p>
                              <ul className="space-y-1">
                                {itinerary.halal_tips.map((tip, i) => (
                                  <li key={i} className="text-xs text-white/60 flex gap-2">
                                    <span className="text-teal-400 flex-shrink-0">•</span>{tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
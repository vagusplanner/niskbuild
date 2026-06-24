/**
 * TravelModeActivator
 * Detects if user is abroad, activates Travel Mode with:
 * - GPS-based prayer times adjusted to local timezone
 * - Nearest halal restaurants (within 2km)
 * - Mosques within 5km radius
 * - Push notification alarms for travel prayer times
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, MapPin, Utensils, Moon, Navigation, Loader2,
  Bell, BellOff, ChevronRight, X, Wifi, Map, RefreshCw,
  Clock, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const APP_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png';
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_EMOJI = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

function fireAlarm({ title, body, tag }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: APP_ICON, tag, requireInteraction: true, badge: APP_ICON });
  } catch {}
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const data = await res.json();
    return {
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Unknown',
      country: data.address?.country || '',
      countryCode: data.address?.country_code?.toUpperCase() || '',
    };
  } catch { return { city: 'Unknown', country: '', countryCode: '' }; }
}

async function fetchPrayerTimesGPS(lat, lng) {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(`https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=2`);
  const data = await res.json();
  if (data.code === 200) return data.data.timings;
  return null;
}

async function fetchMosquesNearby(lat, lng) {
  // Overpass API — mosques within 5km
  const query = `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lng}););out center 12;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await res.json();
    return (data.elements || []).map(el => {
      const elLat = el.lat || el.center?.lat;
      const elLng = el.lon || el.center?.lon;
      const distKm = elLat && elLng ? calcDistKm(lat, lng, elLat, elLng) : null;
      return {
        id: el.id,
        name: el.tags?.name || el.tags?.['name:en'] || 'Mosque',
        address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', '),
        distKm,
        lat: elLat, lng: elLng,
      };
    }).filter(m => m.distKm !== null).sort((a, b) => a.distKm - b.distKm).slice(0, 8);
  } catch { return []; }
}

async function fetchHalalNearby(lat, lng) {
  // Overpass — halal restaurants/cafes within 2km
  const query = `[out:json][timeout:15];(node["diet:halal"="yes"](around:2000,${lat},${lng});node["amenity"~"restaurant|cafe|fast_food"]["diet:halal"!="no"](around:1500,${lat},${lng}););out 15;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST', body: query,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await res.json();
    return (data.elements || []).map(el => {
      const distKm = calcDistKm(lat, lng, el.lat, el.lon);
      return {
        id: el.id,
        name: el.tags?.name || 'Halal Restaurant',
        cuisine: el.tags?.cuisine || '',
        address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' '),
        distKm,
        halal: el.tags?.['diet:halal'] === 'yes',
      };
    }).sort((a, b) => a.distKm - b.distKm).slice(0, 8);
  } catch { return []; }
}

function calcDistKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  if (km === null || km === undefined) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function nextPrayerInfo(timings) {
  if (!timings) return null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const name of PRAYERS) {
    const t = timings[name];
    if (!t) continue;
    const [h, m] = t.split(':').map(Number);
    const pMins = h * 60 + m;
    if (pMins > nowMins) {
      const diff = pMins - nowMins;
      return { name, time: t, minsLeft: diff };
    }
  }
  return { name: 'Fajr', time: timings.Fajr, minsLeft: null };
}

export default function TravelModeActivator({ compact = false }) {
  const [tab, setTab] = useState('prayer');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null); // { lat, lng, city, country, countryCode }
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [halal, setHalal] = useState([]);
  const [alarmsEnabled, setAlarmsEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [expanded, setExpanded] = useState(!compact);
  const alarmTimersRef = useRef([]);

  // Schedule prayer alarms for travel location
  const scheduleTravelAlarms = (timings, city) => {
    // Clear old alarms
    alarmTimersRef.current.forEach(t => clearTimeout(t));
    alarmTimersRef.current = [];

    const now = new Date();
    const today = new Date().toISOString().split('T')[0];

    PRAYERS.forEach(name => {
      const t = timings[name];
      if (!t) return;
      const [h, m] = t.split(':').map(Number);
      const prayerDate = new Date();
      prayerDate.setHours(h, m, 0, 0);
      // Notify 10 mins before
      const fireAt = new Date(prayerDate.getTime() - 10 * 60 * 1000);
      const msUntil = fireAt.getTime() - now.getTime();
      if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          fireAlarm({
            title: `${PRAYER_EMOJI[name]} ${name} Prayer — ${city}`,
            body: `${name} is in 10 minutes (${t} local time). You are in ${city}.`,
            tag: `travel-prayer-${name}-${today}`,
          });
        }, msUntil);
        alarmTimersRef.current.push(timer);
      }
      // Also fire at prayer time
      const msUntilExact = prayerDate.getTime() - now.getTime();
      if (msUntilExact > 0 && msUntilExact < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          fireAlarm({
            title: `🕌 ${name} Prayer Time — ${city}`,
            body: `It is now ${t} in ${city}. Time for ${name} prayer.`,
            tag: `travel-prayer-exact-${name}-${today}`,
          });
        }, msUntilExact);
        alarmTimersRef.current.push(timer);
      }
    });

    toast.success(`Travel prayer alarms set for ${city}!`);
  };

  const enableAlarms = async () => {
    if (!('Notification' in window)) { toast.error('Notifications not supported on this device.'); return; }
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result !== 'granted') { toast.error('Please allow notifications to enable prayer alarms.'); return; }
    }
    setAlarmsEnabled(true);
    if (prayerTimes && location) scheduleTravelAlarms(prayerTimes, location.city);
  };

  const disableAlarms = () => {
    alarmTimersRef.current.forEach(t => clearTimeout(t));
    alarmTimersRef.current = [];
    setAlarmsEnabled(false);
    toast.info('Travel prayer alarms disabled.');
  };

  const activate = async () => {
    if (!navigator.geolocation) { toast.error('GPS not available on this device.'); return; }
    setLoading(true);
    setTab('prayer');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const [geo, times, mosquesData, halalData] = await Promise.all([
            reverseGeocode(lat, lng),
            fetchPrayerTimesGPS(lat, lng),
            fetchMosquesNearby(lat, lng),
            fetchHalalNearby(lat, lng),
          ]);
          const loc = { lat, lng, ...geo };
          setLocation(loc);
          setPrayerTimes(times);
          setMosques(mosquesData);
          setHalal(halalData);
          if (!expanded) setExpanded(true);
          toast.success(`Travel Mode active — ${geo.city}, ${geo.country}`);
          if (alarmsEnabled && times) scheduleTravelAlarms(times, geo.city);
        } catch (e) {
          toast.error('Could not load travel data. Check your connection.');
        }
        setLoading(false);
      },
      (err) => {
        toast.error('GPS access denied. Please allow location in your browser.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    return () => alarmTimersRef.current.forEach(t => clearTimeout(t));
  }, []);

  const next = prayerTimes ? nextPrayerInfo(prayerTimes) : null;

  if (compact && !expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-500/10 to-teal-500/10 border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all">
        <Plane className="w-4 h-4 text-sky-500 flex-shrink-0" />
        <span className="text-sm font-bold text-sky-700 dark:text-sky-300 flex-1 text-left">Travel Mode</span>
        {location && <span className="text-xs text-sky-500 font-medium">{location.city}</span>}
        <ChevronRight className="w-4 h-4 text-sky-400" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Plane className="w-5 h-5 text-white" />
          <div>
            <p className="font-black text-white text-sm">Travel Mode</p>
            {location
              ? <p className="text-xs text-sky-100">{location.city}, {location.country}</p>
              : <p className="text-xs text-sky-100">GPS-powered Islamic travel tools</p>
            }
          </div>
        </div>
        <div className="flex items-center gap-2">
          {location && (
            <button onClick={activate} disabled={loading}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors" title="Refresh location">
              <RefreshCw className={cn("w-3.5 h-3.5 text-white", loading && "animate-spin")} />
            </button>
          )}
          {compact && (
            <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Activate button */}
        {!location && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/40 dark:to-teal-900/30 flex items-center justify-center mx-auto">
              <Navigation className="w-6 h-6 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Activate Travel Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Uses your GPS to show local prayer times, nearby mosques & halal food</p>
            </div>
            <Button onClick={activate} disabled={loading}
              className="bg-gradient-to-r from-sky-500 to-teal-500 hover:opacity-90 text-white font-bold w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Detecting Location...</> : <><Navigation className="w-4 h-4 mr-2" />Use My GPS Location</>}
            </Button>
          </div>
        )}

        {/* Active Travel Mode */}
        {location && (
          <>
            {/* Next prayer countdown */}
            {next && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                <span className="text-2xl">{PRAYER_EMOJI[next.name]}</span>
                <div className="flex-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide">Next Prayer</p>
                  <p className="font-black text-amber-800 dark:text-amber-200">{next.name} — {next.time}</p>
                  {next.minsLeft && <p className="text-xs text-amber-600 dark:text-amber-400">in {next.minsLeft} minutes</p>}
                </div>
                {/* Alarm toggle */}
                <button onClick={alarmsEnabled ? disableAlarms : enableAlarms}
                  className={cn("p-2 rounded-xl transition-all", alarmsEnabled ? "bg-amber-500 text-white" : "bg-white dark:bg-slate-800 text-amber-500 border border-amber-300 dark:border-amber-700")}
                  title={alarmsEnabled ? "Disable prayer alarms" : "Enable prayer alarms"}>
                  {alarmsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
              </div>
            )}

            {alarmsEnabled && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Prayer alarms active for {location.city} — you'll be notified 10 min before each prayer</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {[{id:'prayer', label:'🕌 Prayers'}, {id:'mosques', label:'🕍 Mosques'}, {id:'halal', label:'🍽️ Halal Food'}].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn("flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-all",
                    tab === t.id ? "bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Prayer Times */}
            <AnimatePresence mode="wait">
              {tab === 'prayer' && prayerTimes && (
                <motion.div key="prayer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <div className="px-4 py-2 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900 flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Today in {location.city}
                    </span>
                    <span className="text-[10px] text-sky-500">{new Date().toLocaleDateString()}</span>
                  </div>
                  {PRAYERS.map(name => {
                    const isNext = next?.name === name;
                    return (
                      <div key={name} className={cn(
                        "flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0",
                        isNext && "bg-amber-50 dark:bg-amber-950/20"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{PRAYER_EMOJI[name]}</span>
                          <span className={cn("text-sm font-semibold", isNext ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-200")}>{name}</span>
                          {isNext && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEXT</span>}
                        </div>
                        <span className={cn("text-sm font-black", isNext ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400")}>{prayerTimes[name]}</span>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Mosques */}
              {tab === 'mosques' && (
                <motion.div key="mosques" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  {mosques.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Map className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No mosques found within 5km</p>
                    </div>
                  ) : mosques.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-base">🕌</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{m.name}</p>
                        {m.address && <p className="text-xs text-slate-400 truncate">{m.address}</p>}
                      </div>
                      {m.distKm !== null && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">{formatDist(m.distKm)}</span>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 text-center">Mosques within 5km of your GPS location</p>
                </motion.div>
              )}

              {/* Halal Food */}
              {tab === 'halal' && (
                <motion.div key="halal" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  {halal.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No halal-tagged restaurants found nearby</p>
                      <p className="text-xs mt-1">Try the Halal Scanner tab to check food labels</p>
                    </div>
                  ) : halal.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{r.name}</p>
                          {r.halal && <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">✓ HALAL</span>}
                        </div>
                        {r.cuisine && <p className="text-xs text-slate-400">{r.cuisine}</p>}
                        {r.address && <p className="text-xs text-slate-400 truncate">{r.address}</p>}
                      </div>
                      {r.distKm !== null && (
                        <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">{formatDist(r.distKm)}</span>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400 text-center">Halal-certified restaurants within 2km</p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
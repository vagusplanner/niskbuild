import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Compass, MapPin, Loader2, Navigation, RotateCw,
  Sun, Sunrise, Sunset, Moon, Clock, Building2
} from 'lucide-react';
import NearbyMosqueMap from './NearbyMosqueMap';
import TahajjudScheduler from './TahajjudScheduler';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchPrayerTimes, getNextPrayer as engineGetNextPrayer } from './prayerEngine';

// ── Shared constants ──────────────────────────────────────────────────────────
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calcQibla(lat, lng) {
  const φ1 = lat * Math.PI / 180;
  const φ2 = KAABA_LAT * Math.PI / 180;
  const Δλ = (KAABA_LNG - lng) * Math.PI / 180;
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function distanceKm(lat1, lng1) {
  const R = 6371;
  const dLat = (KAABA_LAT - lat1) * Math.PI / 180;
  const dLng = (KAABA_LNG - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(KAABA_LAT * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const PRAYER_NAMES = [
  { name: 'Fajr',    icon: Sunrise, color: 'from-indigo-500 to-purple-600' },
  { name: 'Dhuhr',   icon: Sun,     color: 'from-amber-400 to-orange-500'  },
  { name: 'Asr',     icon: Sun,     color: 'from-orange-400 to-red-500'    },
  { name: 'Maghrib', icon: Sunset,  color: 'from-rose-400 to-pink-600'     },
  { name: 'Isha',    icon: Moon,    color: 'from-violet-500 to-indigo-700'  },
];

function to12h(t24) {
  if (!t24) return '--:--';
  const [h, m] = t24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatCountdown(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Prayer Times Tab (uses AdvancedPrayerTimes logic + amber styling) ─────────
function PrayerTimesTab({ settings, adjustments }) {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer]   = useState(null);
  const [countdown, setCountdown]     = useState(null);

  const getAdjusted = (name, time) => {
    if (!time) return '--:--';
    const adj = adjustments.find(a => a.prayer_name === name);
    if (!adj?.adjustment_minutes) return time;
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m + adj.adjustment_minutes;
    if (total < 0) total += 1440;
    if (total >= 1440) total -= 1440;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const load = async () => {
      const lat = settings?.latitude || 51.5074;
      const lng = settings?.longitude || -0.1278;
      const method = settings?.prayer_method || 'MWL';
      const times = await fetchPrayerTimes(new Date(), lat, lng, method, '0', settings?.prayer_time_offsets || {});
      setPrayerTimes(times);
      setNextPrayer(engineGetNextPrayer(times));
    };
    load();
    const iv = setInterval(() => {
      if (prayerTimes) setNextPrayer(engineGetNextPrayer(prayerTimes));
    }, 60000);
    return () => clearInterval(iv);
  }, [settings, adjustments]);

  useEffect(() => {
    if (!prayerTimes || !nextPrayer) return;
    const tick = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const pTime = getAdjusted(nextPrayer.name, prayerTimes[nextPrayer.name]);
      const [h, m] = pTime.split(':').map(Number);
      let diff = h * 60 + m - nowMins;
      if (diff < 0) diff += 1440;
      setCountdown(diff);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [nextPrayer, prayerTimes]);

  if (!prayerTimes) return (
    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
  );

  const nextData = PRAYER_NAMES.find(p => p.name === nextPrayer?.name);

  return (
    <div className="p-4 space-y-4">
      {/* Next prayer hero — amber/orange gradient matching original Prayer Times Widget style */}
      {nextData && (
        <div className={`bg-gradient-to-r ${nextData.color} rounded-2xl p-4 text-white shadow-md`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white/75 text-xs mb-0.5">Next Prayer</p>
              <h3 className="text-2xl font-black">{nextPrayer?.name}</h3>
            </div>
            <nextData.icon className="w-12 h-12 text-white/30" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xl font-mono font-bold">{to12h(getAdjusted(nextPrayer?.name, prayerTimes[nextPrayer?.name]))}</span>
          </div>
          {countdown != null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Time remaining</span>
                <span className="font-bold">{formatCountdown(countdown)}</span>
              </div>
              <Progress value={Math.max(0, 100 - (countdown / 300) * 100)} className="h-1.5 bg-white/20" />
            </div>
          )}
        </div>
      )}

      {/* All prayers */}
      <div className="space-y-1.5">
        {PRAYER_NAMES.map((prayer, i) => {
          const Icon = prayer.icon;
          const isNext = prayer.name === nextPrayer?.name;
          const adj = getAdjusted(prayer.name, prayerTimes[prayer.name]);
          const adjRecord = adjustments.find(a => a.prayer_name === prayer.name && a.adjustment_minutes !== 0);
          return (
            <motion.div
              key={prayer.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                isNext
                  ? `bg-gradient-to-r ${prayer.color} text-white shadow-md`
                  : 'bg-amber-50/60 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-slate-800 border border-amber-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isNext ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  <Icon className={`w-4 h-4 ${isNext ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${isNext ? 'text-white' : 'text-amber-900 dark:text-amber-100'}`}>{prayer.name}</p>
                  {adjRecord && <p className={`text-xs ${isNext ? 'text-white/70' : 'text-amber-500'}`}>{adjRecord.adjustment_minutes > 0 ? '+' : ''}{adjRecord.adjustment_minutes}m offset</p>}
                </div>
              </div>
              <span className={`font-mono text-sm font-bold tabular-nums ${isNext ? 'text-white' : 'text-amber-700 dark:text-amber-300'}`}>
                {to12h(adj)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {settings?.location_city && (
        <p className="text-xs text-amber-500/70 text-center">{settings.location_city}{settings.location_country ? `, ${settings.location_country}` : ''}</p>
      )}
    </div>
  );
}

// ── Qibla Tab (uses EnhancedQiblaFinder logic + emerald styling) ──────────────
function QiblaTab({ settings }) {
  const [qibla, setQibla]             = useState(null);
  const [heading, setHeading]         = useState(0);
  const [location, setLocation]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [compassSupported, setCS]     = useState(false);
  const [aligned, setAligned]         = useState(false);

  // Auto-use saved location
  useEffect(() => {
    if (settings?.latitude && settings?.longitude) {
      const { latitude: lat, longitude: lng } = settings;
      setLocation({ lat, lng });
      setQibla(calcQibla(lat, lng));
    }
  }, [settings]);

  // Device orientation
  useEffect(() => {
    const handler = (e) => {
      const angle = e.webkitCompassHeading ?? (e.alpha ? 360 - e.alpha : 0);
      setHeading(angle);
      setCS(true);
    };
    const init = async () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        try {
          const perm = await DeviceOrientationEvent.requestPermission();
          if (perm === 'granted') window.addEventListener('deviceorientation', handler, true);
        } catch {}
      } else {
        window.addEventListener('deviceorientation', handler, true);
      }
    };
    init();
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  // Alignment detection
  useEffect(() => {
    if (qibla === null) return;
    const diff = Math.abs(((qibla - heading) + 360) % 360);
    setAligned(diff < 10 || diff > 350);
  }, [heading, qibla]);

  const getLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setLocation({ lat, lng });
        setQibla(calcQibla(lat, lng));
        setLoading(false);
        toast.success('Qibla direction calculated');
      },
      () => { setLoading(false); toast.error('Could not access location'); },
      { enableHighAccuracy: true }
    );
  };

  const relativeAngle = qibla !== null ? ((qibla - heading + 360) % 360) : 0;
  const distance = location ? distanceKm(location.lat, location.lng) : null;
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
  const compassDir = DIRS[Math.round(((qibla || 0) / 45)) % 8];

  return (
    <div className="p-4">
      {/* Emerald header bar matching original Qibla Widget */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Qibla Direction</p>
            {distance && (
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 flex items-center gap-1">
                <MapPin className="w-3 h-3" />{distance.toLocaleString()} km to Makkah
              </p>
            )}
          </div>
        </div>
        {qibla !== null && (
          <Badge className={`${aligned ? 'bg-green-100 text-green-800 border-green-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'} font-semibold transition-colors`}>
            {aligned ? '✓ Aligned!' : `${Math.round(qibla)}° ${compassDir}`}
          </Badge>
        )}
      </div>

      {qibla === null ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Compass className="w-12 h-12 text-emerald-500" />
          </div>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Find the direction of the Kaaba from your location</p>
          <Button onClick={getLocation} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
            {loading ? 'Locating…' : 'Find Qibla Direction'}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative w-52 h-52">
              <div className={`absolute inset-0 rounded-full border-4 transition-colors duration-500 ${aligned ? 'border-green-500 shadow-lg shadow-green-200 dark:shadow-green-900' : 'border-emerald-300 dark:border-emerald-700'}`} />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                {[...Array(36)].map((_, i) => {
                  const angle = (i * 10) * Math.PI / 180;
                  const isMajor = i % 9 === 0;
                  const r1 = isMajor ? 90 : 93;
                  return (
                    <line key={i}
                      x1={100 + r1 * Math.sin(angle)} y1={100 - r1 * Math.cos(angle)}
                      x2={100 + 97 * Math.sin(angle)} y2={100 - 97 * Math.cos(angle)}
                      stroke={isMajor ? '#0d9488' : '#d1fae5'} strokeWidth={isMajor ? 2 : 1}
                    />
                  );
                })}
              </svg>
              {[['N',0],['E',90],['S',180],['W',270]].map(([d, deg]) => {
                const r = 78, a = deg * Math.PI / 180;
                return (
                  <div key={d} className="absolute text-[11px] font-bold text-emerald-700 dark:text-emerald-300 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${50 + r * Math.sin(a) / 104 * 100}%`, top: `${50 - r * Math.cos(a) / 104 * 100}%` }}>
                    {d}
                  </div>
                );
              })}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20" />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: relativeAngle }}
                transition={{ type: 'spring', stiffness: 60, damping: 12 }}
              >
                <div className="relative h-36 flex flex-col items-center">
                  <div className="text-base mb-0.5">🕋</div>
                  <div className="w-1.5 flex-1 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-full shadow" />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-0.5" />
                </div>
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg transition-colors duration-300 ${aligned ? 'bg-green-500' : 'bg-emerald-600'}`} />
              </div>
            </div>

            <AnimatePresence>
              {aligned && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="mt-3 px-4 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-sm font-semibold"
                >
                  ✓ Facing Qibla
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{Math.round(qibla)}°</p>
              <p className="text-[10px] text-slate-500">Qibla</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-lg font-bold text-teal-700 dark:text-teal-400">{compassDir}</p>
              <p className="text-[10px] text-slate-500">Direction</p>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{distance ? `${Math.round(distance / 100) / 10}k` : '—'}</p>
              <p className="text-[10px] text-slate-500">km away</p>
            </div>
          </div>

          {!compassSupported && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
              ℹ️ Compass not detected – arrow shows absolute direction
            </p>
          )}

          <Button variant="outline" size="sm" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={getLocation} disabled={loading}>
            <RotateCw className="w-4 h-4 mr-2" /> Recalculate
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Unified panel ─────────────────────────────────────────────────────────────
export default function PrayerAndQiblaPanel() {
  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const { data: adjustments = [] } = useQuery({
    queryKey: ['prayer-adjustments'],
    queryFn: () => base44.entities.PrayerTimeAdjustment.list(),
  });

  const settings = userSettings[0];

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <Tabs defaultValue="prayer">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-amber-200 dark:border-amber-800 px-4 pt-4 pb-0">
          <TabsList className="w-full bg-amber-100/80 dark:bg-amber-900/30">
            <TabsTrigger value="prayer" className="flex-1 gap-1 text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Sunrise className="w-3.5 h-3.5" /> Prayers
            </TabsTrigger>
            <TabsTrigger value="qibla" className="flex-1 gap-1 text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Compass className="w-3.5 h-3.5" /> Qibla
            </TabsTrigger>
            <TabsTrigger value="mosques" className="flex-1 gap-1 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              <Building2 className="w-3.5 h-3.5" /> Mosques
            </TabsTrigger>
            <TabsTrigger value="tahajjud" className="flex-1 gap-1 text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Moon className="w-3.5 h-3.5" /> Tahajjud
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="prayer" className="mt-0 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-transparent">
          <PrayerTimesTab settings={settings} adjustments={adjustments} />
        </TabsContent>
        <TabsContent value="qibla" className="mt-0 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-transparent">
          <QiblaTab settings={settings} />
        </TabsContent>
        <TabsContent value="mosques" className="mt-0">
          <NearbyMosqueMap />
        </TabsContent>
        <TabsContent value="tahajjud" className="mt-0 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-transparent">
          <TahajjudScheduler />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
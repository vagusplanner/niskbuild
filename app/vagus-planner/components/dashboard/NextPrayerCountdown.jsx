/**
 * NextPrayerCountdown
 * Real-time dashboard widget — fetches prayer times from AlAdhan API,
 * auto-detects user location, and shows a live ticking countdown.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRAYERS = [
  { key: 'Fajr',    label: 'Fajr',    emoji: '🌅', gradient: 'from-[#1B2A4A] to-[#0D4F6C]',   bg: 'from-[#D4E0EC] to-[#C0CDD9]',  dark: 'dark:from-[#1B2A4A]/60 dark:to-[#0D4F6C]/60', text: 'text-[#1B2A4A] dark:text-[#A8C8E8]' },
  { key: 'Dhuhr',   label: 'Dhuhr',   emoji: '☀️', gradient: 'from-[#E8B84B] to-[#d4a33a]',   bg: 'from-[#D4E0EC] to-[#C0CDD9]',  dark: 'dark:from-[#1B2A4A]/60 dark:to-[#0D4F6C]/60',  text: 'text-[#1B2A4A] dark:text-[#E8B84B]' },
  { key: 'Asr',     label: 'Asr',     emoji: '🌤️', gradient: 'from-[#2980B9] to-[#1D6FB8]',   bg: 'from-[#D4E0EC] to-[#C0CDD9]',  dark: 'dark:from-[#1B2A4A]/60 dark:to-[#2980B9]/40',   text: 'text-[#1D6FB8] dark:text-[#A8C8E8]' },
  { key: 'Maghrib', label: 'Maghrib', emoji: '🌆', gradient: 'from-[#1D6FB8] to-[#29ABE2]',   bg: 'from-[#D4E0EC] to-[#C0CDD9]',  dark: 'dark:from-[#1B2A4A]/60 dark:to-[#1D6FB8]/40',   text: 'text-[#1D6FB8] dark:text-[#29ABE2]' },
  { key: 'Isha',    label: 'Isha',    emoji: '🌙', gradient: 'from-[#0D4F6C] to-[#1B2A4A]',   bg: 'from-[#D4E0EC] to-[#C0CDD9]',  dark: 'dark:from-[#0D4F6C]/60 dark:to-[#1B2A4A]/60',   text: 'text-[#0D4F6C] dark:text-[#A8C8E8]' },
];

const METHOD_MAP = { MWL: 3, ISNA: 2, Egypt: 5, Makkah: 4, Karachi: 1, Tehran: 7, Jafari: 0 };

function timeStrToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
}

function getNextPrayer(times) {
  const now = nowMinutes();
  for (const p of PRAYERS) {
    if (timeStrToMinutes(times[p.key]) > now) return p;
  }
  return PRAYERS[0]; // wrap to Fajr next day
}

function secondsUntil(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  let diff = Math.floor((target - now) / 1000);
  if (diff < 0) diff += 86400; // next day
  return diff;
}

function fmtCountdown(secs) {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export default function NextPrayerCountdown({ settings }) {
  const [times, setTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tickRef = useRef(null);

  // Detect coordinates — prefer saved settings, fallback to Geolocation
  const getCoords = useCallback(() => {
    if (settings?.latitude && settings?.longitude) {
      return Promise.resolve({
        lat: settings.latitude,
        lng: settings.longitude,
        city: settings.location_city || '',
        country: settings.location_country || '',
      });
    }
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 51.5074, lng: -0.1278, city: 'London', country: 'GB' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, city: '', country: '' }),
        () => resolve({ lat: 51.5074, lng: -0.1278, city: 'London', country: 'GB' }),
        { timeout: 5000 }
      );
    });
  }, [settings]);

  const fetchTimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCoords();
      setLocation(coords);
      const method = METHOD_MAP[settings?.prayer_method] ?? 3;
      const ts = Math.floor(Date.now() / 1000);
      const res = await fetch(
        `https://api.aladhan.com/v1/timings/${ts}?latitude=${coords.lat}&longitude=${coords.lng}&method=${method}`
      );
      if (!res.ok) throw new Error('AlAdhan API error');
      const json = await res.json();
      const t = json.data.timings;
      const filtered = { Fajr: t.Fajr, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha };

      // Reverse-geocode city name if not in settings
      if (!coords.city) {
        try {
          const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`);
          const geoData = await geo.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || '';
          setLocation(prev => ({ ...prev, city }));
        } catch (_) {}
      }

      setTimes(filtered);
      const next = getNextPrayer(filtered);
      setNextPrayer(next);
      setCountdown(secondsUntil(filtered[next.key]));
    } catch (e) {
      setError('Could not load prayer times. Check your location settings.');
    } finally {
      setLoading(false);
    }
  }, [getCoords, settings]);

  // Initial fetch + refresh every hour
  useEffect(() => {
    fetchTimes();
    const refresh = setInterval(fetchTimes, 3600000);
    return () => clearInterval(refresh);
  }, [fetchTimes]);

  // Live countdown tick every second
  useEffect(() => {
    if (!times || !nextPrayer) return;
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Prayer time arrived — recalculate next
          const next = getNextPrayer(times);
          setNextPrayer(next);
          return secondsUntil(times[next.key]);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [times, nextPrayer]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#7A9EB5]/40 dark:border-[#1D6FB8]/30 bg-[#D4E0EC] dark:bg-slate-900 p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
        <div className="h-12 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
        <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
        <button onClick={fetchTimes} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>
    );
  }

  if (!times || !nextPrayer) return null;

  const digits = fmtCountdown(countdown).split(':');

  return (
    <Link to={createPageUrl('Islam')} className="block group">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl border overflow-hidden bg-gradient-to-r',
          nextPrayer.bg, nextPrayer.dark,
          'border-[#7A9EB5]/40 dark:border-[#1D6FB8]/30 hover:shadow-lg transition-all'
        )}
      >
        {/* Top hero strip */}
        <div className={`bg-gradient-to-r ${nextPrayer.gradient} px-5 py-4 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/75 text-xs font-semibold uppercase tracking-widest mb-0.5">Next Prayer</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{nextPrayer.emoji}</span>
                <p className="text-3xl font-black">{nextPrayer.label}</p>
                <p className="text-white/80 text-sm font-mono ml-2">{times[nextPrayer.key]}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
          </div>

          {/* Live countdown digits */}
          <div className="flex items-center gap-1.5 mt-3">
            {digits.map((d, i) => (
              <React.Fragment key={i}>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={d}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1 min-w-[2.5rem] text-center"
                  >
                    <span className="text-xl font-black tabular-nums">{d}</span>
                  </motion.div>
                </AnimatePresence>
                {i < 2 && <span className="text-white/60 font-bold text-xl leading-none pb-0.5">:</span>}
              </React.Fragment>
            ))}
            <span className="text-white/60 text-xs ml-1">remaining</span>
          </div>
        </div>

        {/* All 5 prayers mini row */}
        <div className="px-4 py-3 flex items-center justify-between gap-1 overflow-x-auto hide-scrollbar">
          {PRAYERS.map(p => {
            const isNext = p.key === nextPrayer.key;
            const isPast = timeStrToMinutes(times[p.key]) < nowMinutes() && !isNext;
            return (
              <div
                key={p.key}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-shrink-0 transition-all',
                  isNext && `bg-gradient-to-b ${p.gradient} shadow-sm`,
                )}
              >
                <span className="text-base">{p.emoji}</span>
                <span className={cn('text-[10px] font-bold', isNext ? 'text-white' : isPast ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-400')}>{p.label}</span>
                <span className={cn('text-[10px] font-mono tabular-nums', isNext ? 'text-white/90' : isPast ? 'text-slate-300 dark:text-slate-600 line-through' : 'text-slate-500 dark:text-slate-500')}>{times[p.key]}</span>
              </div>
            );
          })}
          {location?.city && (
            <div className="flex flex-col items-center gap-0.5 ml-auto pl-2 border-l border-slate-200 dark:border-slate-700 flex-shrink-0">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] text-slate-400 max-w-[60px] truncate text-center">{location.city}</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
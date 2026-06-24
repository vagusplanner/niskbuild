import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SDK } from '@/lib/custom-sdk.js';
import { MapPin, Bell, BellOff, CheckCircle2, Loader2, Calendar, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_EMOJIS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌅', Isha: '🌙' };
const STORAGE_KEY = 'prayer_notifications_enabled';
const TIMERS_KEY  = 'prayer_notification_timers';

function scheduleNotifications(prayerTimes) {
  // Clear old timeouts stored in sessionStorage
  const oldTimers = JSON.parse(sessionStorage.getItem(TIMERS_KEY) || '[]');
  oldTimers.forEach(id => clearTimeout(id));

  if (Notification.permission !== 'granted') return;

  const newTimers = [];
  const now = Date.now();

  prayerTimes.forEach(({ prayer, time, date }) => {
    const clean = time.replace(/\s*\(.*?\)/, '').trim();
    const dt = new Date(`${date} ${clean}`);
    const ms = dt.getTime() - now;
    if (ms > 0 && ms < 24 * 60 * 60 * 1000) {
      const id = setTimeout(() => {
        new Notification(`🕌 ${prayer} Time`, {
          body: `It's time for ${prayer} prayer. ${PRAYER_EMOJIS[prayer]}`,
          icon: '/icon-192.png',
          tag: `prayer-${prayer}`,
          requireInteraction: false,
        });
      }, ms);
      newTimers.push(id);
    }
  });

  sessionStorage.setItem(TIMERS_KEY, JSON.stringify(newTimers));
}

export default function PrayerCalendarSync() {
  const [location, setLocation]     = useState(null);
  const [locError, setLocError]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(false);
  const [todayTimes, setTodayTimes] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [notifOn, setNotifOn]       = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [notifPerm, setNotifPerm]   = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');

  // Auto-detect location on mount
  useEffect(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported by your browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocError('Location access denied. Please enable location in browser settings.'),
      { timeout: 10000 }
    );
  }, []);

  // Fetch today's prayer times when location is available
  useEffect(() => {
    if (!location) return;
    fetchTodayTimes();
  }, [location]);

  // Re-schedule notifications when todayTimes or notifOn changes
  useEffect(() => {
    if (notifOn && todayTimes) scheduleNotifications(todayTimes);
  }, [notifOn, todayTimes]);

  const fetchTodayTimes = async () => {
    if (!location) return;
    setFetching(true);
    try {
      const ts = Math.floor(Date.now() / 1000);
      const res = await fetch(`https://api.aladhan.com/v1/timings/${ts}?latitude=${location.lat}&longitude=${location.lng}&method=2`);
      const json = await res.json();
      if (json.code === 200) {
        const t = json.data.timings;
        const dateStr = json.data.date.readable;
        setTodayTimes(PRAYERS.map(p => ({ prayer: p, time: t[p], date: dateStr })));
      }
    } catch (_) {}
    setFetching(false);
  };

  const syncToCalendar = async () => {
    if (!location) return;
    setLoading(true);
    setSyncResult(null);
    try {
      const res = await SDK.functions.invoke('prayerCalendarSync', {
        latitude: location.lat,
        longitude: location.lng,
        days: 7,
      });
      setSyncResult(res.data);
      toast.success(`✅ ${res.data.created} prayer events added to your calendar!`);
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    }
    setLoading(false);
  };

  const toggleNotifications = async () => {
    if (!notifOn) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm !== 'granted') {
        toast.error('Please allow notifications in your browser settings.');
        return;
      }
      setNotifOn(true);
      localStorage.setItem(STORAGE_KEY, 'true');
      if (todayTimes) scheduleNotifications(todayTimes);
      toast.success('🔔 Prayer notifications enabled!');
    } else {
      setNotifOn(false);
      localStorage.setItem(STORAGE_KEY, 'false');
      const old = JSON.parse(sessionStorage.getItem(TIMERS_KEY) || '[]');
      old.forEach(id => clearTimeout(id));
      toast.success('Notifications disabled.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Prayer Auto-Scheduler</h3>
              <p className="text-xs text-white/80">Sync prayer times to your calendar & get notified</p>
            </div>
          </div>
          <button onClick={fetchTodayTimes} disabled={fetching || !location}
            className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', fetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Location status */}
      <div className={cn('flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-sm',
        location ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                 : locError ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300'
                 : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500')}>
        <MapPin className="w-4 h-4 flex-shrink-0" />
        {location
          ? <span>Location detected: <strong>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</strong></span>
          : locError
          ? <span>{locError}</span>
          : <span>Detecting your location…</span>}
      </div>

      {/* Today's prayer times */}
      {fetching && (
        <div className="flex items-center justify-center py-6 gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Fetching prayer times…</span>
        </div>
      )}

      {todayTimes && !fetching && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/60">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Today's Prayer Times</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {todayTimes.map(({ prayer, time }) => {
              const clean = time?.replace(/\s*\(.*?\)/, '').trim();
              const dt = new Date(`${todayTimes[0].date} ${clean}`);
              const isPast = dt < new Date();
              return (
                <div key={prayer} className={cn('flex items-center justify-between px-4 py-3', isPast && 'opacity-50')}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{PRAYER_EMOJIS[prayer]}</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{prayer}</span>
                    {isPast && <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">DONE</span>}
                  </div>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{clean}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Notification toggle */}
      {todayTimes && (
        <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2.5">
            {notifOn ? <Bell className="w-4 h-4 text-teal-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Prayer Notifications</p>
              <p className="text-[10px] text-slate-400">Get alerted at each prayer time today</p>
            </div>
          </div>
          <button onClick={toggleNotifications}
            className={cn('relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              notifOn ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700')}>
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
              notifOn ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      )}

      {/* Sync to calendar button */}
      {location && (
        <Button onClick={syncToCalendar} disabled={loading || !location}
          className="w-full h-12 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 font-bold text-white shadow-md">
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing 7 days…</>
            : <><Calendar className="w-4 h-4 mr-2" />Add 7 Days of Prayers to Calendar</>}
        </Button>
      )}

      {/* Result */}
      {syncResult && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {syncResult.created > 0 ? `${syncResult.created} prayer events added!` : 'Already up to date — no new events needed.'}
            </p>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
              Check your Calendar to see the next 7 days of prayer times.
            </p>
          </div>
        </motion.div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 text-[10px] text-slate-400 px-1">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>Prayer times are calculated using the Muslim World League method based on your device's GPS location. Notifications are scheduled locally and reset on page reload.</span>
      </div>
    </div>
  );
}
/**
 * PrayerNotificationManager
 *
 * - Fetches today's prayer times from the backend (user's saved location)
 * - Requests browser Notification permission
 * - Schedules automatic browser notifications for each prayer using setTimeout
 * - Persists enabled/disabled preferences per prayer in localStorage
 * - Reschedules on every mount so refreshing the page keeps alerts live
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, BellRing, CheckCircle2, AlertCircle, Loader2,
  MapPin, Settings, Clock, RefreshCw, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = { Fajr: '🌙', Sunrise: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌃' };
const PREF_KEY = 'prayer_notif_prefs_v2';
const SCHEDULE_KEY = 'prayer_notif_scheduled_date';

function to12h(t24) {
  if (!t24) return '--:--';
  const [h, m] = t24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function msUntil(timeStr) {
  if (!timeStr) return -1;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  return target.getTime() - now.getTime();
}

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
}
function savePrefs(p) {
  localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

export default function PrayerNotificationManager() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [prefs, setPrefs] = useState(loadPrefs);
  const [scheduledPrayers, setScheduledPrayers] = useState([]);
  const timersRef = useRef({});

  // Fetch prayer times from backend
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['prayerTimesForUser'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPrayerTimesForUser', {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });

  const prayers = data?.prayers || {};

  // Request notification permission
  const requestPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Your browser does not support notifications');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Notifications enabled! Prayer alerts are now active.');
    } else {
      toast.error('Notification permission denied. Please enable it in your browser settings.');
    }
  };

  // Schedule browser notifications for remaining prayers today
  const scheduleNotifications = useCallback((prayerTimes, userPrefs) => {
    // Clear previous timers
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};

    if (permission !== 'granted') return;

    const scheduled = [];
    for (const prayer of PRAYERS) {
      const time = prayerTimes[prayer];
      if (!time) continue;
      // Default: Sunrise is off, others on
      const isEnabled = userPrefs[prayer] !== undefined ? userPrefs[prayer] : (prayer !== 'Sunrise');
      if (!isEnabled) continue;

      const ms = msUntil(time);
      if (ms <= 0) continue; // Already passed

      const timer = setTimeout(() => {
        if (Notification.permission === 'granted') {
          const notif = new Notification(`🕌 Time for ${prayer}`, {
            body: `${PRAYER_ICONS[prayer]} ${prayer} prayer is now — ${to12h(time)}`,
            icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png',
            badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png',
            tag: `prayer-${prayer}`,
            requireInteraction: false,
            silent: false,
          });
          notif.onclick = () => { window.focus(); notif.close(); };
        }
      }, ms);

      timersRef.current[prayer] = timer;
      scheduled.push(prayer);
    }

    setScheduledPrayers(scheduled);
    // Mark today as scheduled so we know it's active
    localStorage.setItem(SCHEDULE_KEY, new Date().toDateString());
  }, [permission]);

  // Re-schedule whenever data or prefs change
  useEffect(() => {
    if (prayers && Object.keys(prayers).length > 0) {
      scheduleNotifications(prayers, prefs);
    }
    return () => { Object.values(timersRef.current).forEach(clearTimeout); };
  }, [prayers, prefs, permission, scheduleNotifications]);

  const togglePrayer = (prayer) => {
    const current = prefs[prayer] !== undefined ? prefs[prayer] : (prayer !== 'Sunrise');
    const newPrefs = { ...prefs, [prayer]: !current };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    toast.success(`${prayer} notification ${!current ? 'enabled' : 'disabled'}`);
  };

  const enableAllPrayers = () => {
    const newPrefs = {};
    PRAYERS.forEach(p => { newPrefs[p] = true; });
    setPrefs(newPrefs);
    savePrefs(newPrefs);
    toast.success('All prayer notifications enabled');
  };

  const isEnabled = (prayer) =>
    prefs[prayer] !== undefined ? prefs[prayer] : (prayer !== 'Sunrise');

  const isScheduled = (prayer) => scheduledPrayers.includes(prayer);
  const isPast = (prayer) => {
    const time = prayers[prayer];
    return time ? msUntil(time) < 0 : false;
  };

  const nextPrayer = PRAYERS.find(p => prayers[p] && msUntil(prayers[p]) > 0);
  const activeCount = scheduledPrayers.length;

  return (
    <div className="rounded-2xl border border-teal-100 dark:border-teal-900/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-black text-white text-base">Prayer Notifications</h2>
              <p className="text-teal-200 text-xs">
                {permission === 'granted'
                  ? `${activeCount} prayer${activeCount !== 1 ? 's' : ''} scheduled today`
                  : 'Enable alerts for each prayer'}
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Location info */}
        {data?.location && (
          <div className="flex items-center gap-1.5 mt-3 bg-white/10 rounded-lg px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-200 flex-shrink-0" />
            <span className="text-xs text-white font-medium">
              {data.location.city}{data.location.country ? `, ${data.location.country}` : ''}
            </span>
            <span className="text-teal-200 text-xs ml-1">· {data.method}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Permission banner */}
        {permission === 'default' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Enable Browser Notifications</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Allow notifications to receive automatic prayer time alerts even when you're on another tab.
              </p>
            </div>
            <Button size="sm" onClick={requestPermission}
              className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs flex-shrink-0">
              Enable
            </Button>
          </motion.div>
        )}

        {permission === 'denied' && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Notifications Blocked</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Please click the lock icon in your browser address bar and allow notifications for this site.
              </p>
            </div>
          </div>
        )}

        {permission === 'unsupported' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
            <Info className="w-4 h-4 flex-shrink-0" />
            Your browser does not support web notifications.
          </div>
        )}

        {/* No location error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {error.message || 'Could not load prayer times'}
              </p>
              <Link to="/Settings" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">
                Set your location in Settings →
              </Link>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Calculating prayer times...</span>
          </div>
        )}

        {/* Prayer list */}
        {!isLoading && Object.keys(prayers).length > 0 && (
          <>
            {nextPrayer && permission === 'granted' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40">
                <span className="text-xl">{PRAYER_ICONS[nextPrayer]}</span>
                <div>
                  <p className="text-xs font-bold text-teal-700 dark:text-teal-300">Next: {nextPrayer}</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">{to12h(prayers[nextPrayer])}</p>
                </div>
                <Badge className="ml-auto bg-teal-500 text-white border-0 text-xs">Next Up</Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Today's Prayers</p>
                {permission === 'granted' && (
                  <button onClick={enableAllPrayers} className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium">
                    Enable all
                  </button>
                )}
              </div>
              {PRAYERS.map(prayer => {
                const time = prayers[prayer];
                if (!time) return null;
                const past = isPast(prayer);
                const enabled = isEnabled(prayer);
                const scheduled = isScheduled(prayer);

                return (
                  <motion.div key={prayer} layout
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                      past
                        ? 'opacity-50 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                        : enabled && scheduled
                          ? 'border-teal-200 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20'
                          : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                    )}>
                    <span className="text-xl w-8 text-center flex-shrink-0">{PRAYER_ICONS[prayer]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold', past ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100')}>
                        {prayer}
                      </p>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{to12h(time)}</p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!past && enabled && scheduled && (
                        <span className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Scheduled
                        </span>
                      )}
                      {!past && past === false && permission === 'granted' && (
                        <button
                          onClick={() => togglePrayer(prayer)}
                          className={cn(
                            'relative w-10 h-6 rounded-full transition-colors flex-shrink-0',
                            enabled ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        >
                          <span className={cn(
                            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                            enabled ? 'translate-x-5' : 'translate-x-1'
                          )} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Notifications fire automatically at each prayer time while this app is open in any tab. Times are calculated for{' '}
                <span className="font-semibold">{data?.location?.city || 'your saved location'}</span>.{' '}
                <Link to="/Settings" className="text-teal-600 dark:text-teal-400 hover:underline">Update location</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
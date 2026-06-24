/**
 * Night Prayer (Tahajjud) Scheduler
 * Calculates the optimal Tahajjud window based on actual Isha & Fajr times.
 * Best time = last 1/3 of the night before Fajr.
 * Creates a calendar event and can set a browser alarm.
 */
import React, { useState, useEffect } from 'react';
import { Moon, Bell, BellOff, Calendar, Star, Clock, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { fetchPrayerTimes } from './prayerEngine';
import { format, addDays } from 'date-fns';
import { motion } from 'framer-motion';

function timeToMins(t24) {
  if (!t24) return 0;
  const [h, m] = t24.split(':').map(Number);
  return h * 60 + m;
}

function minsToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

function to12h(t24) {
  if (!t24) return '--:--';
  const [h, m] = t24.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const RAKAAT_OPTIONS = [2, 4, 6, 8, 12];
const TAHAJJUD_TIPS = [
  'The best time for Tahajjud is the last third of the night before Fajr.',
  'Start with 2 rakaats and gradually increase.',
  'Make heartfelt dua after Tahajjud — this is a blessed time.',
  'Recite long surahs slowly; quality is better than quantity.',
  'Consistency matters more than length — even 2 rakaats every night.',
];

export default function TahajjudScheduler() {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [tahajjudWindow, setTahajjudWindow] = useState(null);
  const [rakaat, setRakaat] = useState(4);
  const [alarmSet, setAlarmSet] = useState(false);
  const [alarmTimeout, setAlarmTimeout] = useState(null);
  const queryClient = useQueryClient();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list(),
  });
  const settings = settingsList[0];

  const todayTip = TAHAJJUD_TIPS[new Date().getDay() % TAHAJJUD_TIPS.length];

  useEffect(() => {
    const lat = settings?.latitude || 51.5074;
    const lng = settings?.longitude || -0.1278;
    const method = settings?.prayer_method || 'MWL';

    const compute = async () => {
      const todayTimes = await fetchPrayerTimes(new Date(), lat, lng, method, '0', {});
      const tomorrowTimes = await fetchPrayerTimes(addDays(new Date(), 1), lat, lng, method, '0', {});
      setPrayerTimes(todayTimes);

      const ishaMins = timeToMins(todayTimes.Isha);
      const fajrMins = timeToMins(tomorrowTimes.Fajr) + 1440; // next day

      const nightLength = fajrMins - ishaMins;
      const lastThirdStart = ishaMins + Math.floor(nightLength * (2 / 3));
      const optimal = ishaMins + Math.floor(nightLength * (3 / 4)); // sweet spot

      setTahajjudWindow({
        isha: todayTimes.Isha,
        fajr: tomorrowTimes.Fajr,
        lastThirdStart: minsToTime(lastThirdStart),
        optimal: minsToTime(optimal),
        nightLengthMins: nightLength,
      });
    };
    compute();
  }, [settings]);

  const addToCalendarMutation = useMutation({
    mutationFn: () => {
      const tomorrow = addDays(new Date(), 1);
      const dateStr = format(tomorrow, 'yyyy-MM-dd');
      const [h, m] = tahajjudWindow.optimal.split(':').map(Number);
      const start = new Date(tomorrow);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + rakaat * 6 * 60000); // ~6 min per rakat

      return base44.entities.Event.create({
        title: `🌙 Tahajjud Prayer (${rakaat} rakat)`,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        category: 'prayer',
        description: `Optimal Tahajjud time. Night ends at Fajr (${to12h(tahajjudWindow.fajr)}). ${todayTip}`,
        color: '#6366f1',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Tahajjud added to your calendar 🌙');
    },
  });

  const setAlarm = () => {
    if (!tahajjudWindow) return;
    // Browser notification alarm
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser');
      return;
    }
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') { toast.error('Please allow notifications'); return; }

      const now = new Date();
      const [h, m] = tahajjudWindow.optimal.split(':').map(Number);
      const alarmTime = new Date(now);
      alarmTime.setHours(h, m, 0, 0);
      if (alarmTime <= now) alarmTime.setDate(alarmTime.getDate() + 1);

      const delay = alarmTime.getTime() - now.getTime();
      const t = setTimeout(() => {
        new Notification('🌙 Time for Tahajjud', {
          body: `It's ${to12h(tahajjudWindow.optimal)} — the last third of the night. Fajr at ${to12h(tahajjudWindow.fajr)}.`,
          icon: '/icon-192x192.png',
        });
        setAlarmSet(false);
      }, delay);

      setAlarmTimeout(t);
      setAlarmSet(true);
      toast.success(`Alarm set for ${to12h(tahajjudWindow.optimal)}`);
    });
  };

  const cancelAlarm = () => {
    if (alarmTimeout) clearTimeout(alarmTimeout);
    setAlarmSet(false);
    toast.info('Alarm cancelled');
  };

  if (!tahajjudWindow) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const pct = (timeToMins(tahajjudWindow.lastThirdStart) - timeToMins(tahajjudWindow.isha)) /
    tahajjudWindow.nightLengthMins * 100;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
          <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Tahajjud Night Prayer</p>
          <p className="text-xs text-slate-500">Optimal time based on your local Fajr</p>
        </div>
      </div>

      {/* Main window card */}
      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Isha</p>
            <p className="text-base font-black text-indigo-700 dark:text-indigo-300">{to12h(tahajjudWindow.isha)}</p>
          </div>
          <div className="border-x border-indigo-200 dark:border-indigo-800">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">⭐ Optimal</p>
            <p className="text-base font-black text-indigo-700 dark:text-indigo-300">{to12h(tahajjudWindow.optimal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Fajr</p>
            <p className="text-base font-black text-amber-600 dark:text-amber-400">{to12h(tahajjudWindow.fajr)}</p>
          </div>
        </div>

        {/* Night timeline bar */}
        <div>
          <p className="text-xs text-slate-500 mb-1">Last ⅓ of night starts at <strong>{to12h(tahajjudWindow.lastThirdStart)}</strong></p>
          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 bg-indigo-300 dark:bg-indigo-700 rounded-full" style={{ width: `${pct}%` }} />
            <div className="absolute inset-y-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ left: `${pct}%`, width: '30%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>Isha</span>
            <span className="text-indigo-400 font-semibold">Tahajjud</span>
            <span className="text-amber-400">Fajr</span>
          </div>
        </div>
      </div>

      {/* Rakat selector */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">How many rakaats tonight?</p>
        <div className="flex gap-1.5">
          {RAKAAT_OPTIONS.map(r => (
            <button key={r} onClick={() => setRakaat(r)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all ${rakaat === r ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => addToCalendarMutation.mutate()} disabled={addToCalendarMutation.isPending}
          variant="outline" size="sm" className="flex-1 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300">
          {addToCalendarMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
          Add to Calendar
        </Button>
        {alarmSet ? (
          <Button onClick={cancelAlarm} size="sm" className="flex-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 border border-red-200">
            <BellOff className="w-3 h-3 mr-1" /> Cancel Alarm
          </Button>
        ) : (
          <Button onClick={setAlarm} size="sm" className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
            <Bell className="w-3 h-3 mr-1" /> Set Alarm
          </Button>
        )}
      </div>

      {/* Daily tip */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-xl">
        <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300 italic">{todayTip}</p>
      </div>
    </div>
  );
}
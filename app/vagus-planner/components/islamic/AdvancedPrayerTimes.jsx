import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sun, Sunrise, Sunset, Moon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPrayerTimes, PRAYER_DISPLAY, getNextPrayer as engineGetNextPrayer, formatCountdown, minutesUntil } from './prayerEngine';

const PRAYER_NAMES = [
  { name: 'Fajr', icon: Sunrise, color: 'from-indigo-500 to-purple-600' },
  { name: 'Dhuhr', icon: Sun, color: 'from-amber-400 to-orange-500' },
  { name: 'Asr', icon: Sun, color: 'from-orange-400 to-red-500' },
  { name: 'Maghrib', icon: Sunset, color: 'from-rose-400 to-pink-600' },
  { name: 'Isha', icon: Moon, color: 'from-violet-500 to-indigo-700' }
];

export default function AdvancedPrayerTimes({ settings: propSettings }) {
  const { data: userSettings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });
  
  const settings = propSettings || userSettings[0];
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [timeUntilNext, setTimeUntilNext] = useState(null);
  const { data: adjustments = [] } = useQuery({
    queryKey: ['prayer-adjustments'],
    queryFn: () => base44.entities.PrayerTimeAdjustment.list()
  });

  const getAdjustedTime = (prayer, time) => {
    const adjustment = adjustments.find(a => a.prayer_name === prayer);
    if (!adjustment || !adjustment.adjustment_minutes) return time;

    const [h, m] = time.split(':').map(Number);
    let totalMinutes = h * 60 + m + adjustment.adjustment_minutes;
    
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
    
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  const getNextPrayer = (times) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    for (const prayer of PRAYER_NAMES) {
      const time = getAdjustedTime(prayer.name, times[prayer.name]);
      const [h, m] = time.split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      
      if (prayerMinutes > currentMinutes) {
        return { name: prayer.name, minutes: prayerMinutes - currentMinutes };
      }
    }
    
    // Next day Fajr
    const fajrTime = getAdjustedTime('Fajr', times['Fajr']);
    const [h, m] = fajrTime.split(':').map(Number);
    const fajrMinutes = h * 60 + m;
    const minutesUntilMidnight = (24 * 60) - currentMinutes;
    
    return { name: 'Fajr', minutes: minutesUntilMidnight + fajrMinutes };
  };

  useEffect(() => {
    const load = async () => {
      const lat = settings?.latitude || 51.5074;
      const lng = settings?.longitude || -0.1278;
      const method = settings?.prayer_method || 'MWL';
      const asrMethod = settings?.asr_method || '0';
      const offsets = settings?.prayer_time_offsets || {};
      
      const times = await fetchPrayerTimes(new Date(), lat, lng, method, asrMethod, offsets);
      setPrayerTimes(times);
      setNextPrayer(engineGetNextPrayer(times));
    };
    
    load();
    
    const interval = setInterval(() => {
      if (prayerTimes) setNextPrayer(engineGetNextPrayer(prayerTimes));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [settings, adjustments]);

  useEffect(() => {
    if (!nextPrayer) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      if (prayerTimes) {
        const next = getNextPrayer(prayerTimes);
        setTimeUntilNext(next.minutes);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [nextPrayer, prayerTimes]);

  const formatTimeUntil = (minutes) => {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const getProgressPercentage = () => {
    if (!timeUntilNext || !prayerTimes) return 0;
    
    const totalMinutesBetweenPrayers = 5 * 60; // Approximate
    const elapsed = totalMinutesBetweenPrayers - timeUntilNext;
    
    return Math.max(0, Math.min(100, (elapsed / totalMinutesBetweenPrayers) * 100));
  };

  if (!prayerTimes) return null;

  const nextPrayerData = PRAYER_NAMES.find(p => p.name === nextPrayer?.name);

  return (
    <div className="space-y-6">
      {/* Next Prayer Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className={`bg-gradient-to-r ${nextPrayerData?.color || 'from-teal-500 to-cyan-600'} p-6 text-white`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Next Prayer</p>
              <h2 className="text-3xl font-bold">{nextPrayer?.name}</h2>
            </div>
            {nextPrayerData && <nextPrayerData.icon className="w-16 h-16 text-white/30" />}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-2xl font-mono">
                {getAdjustedTime(nextPrayer?.name, prayerTimes[nextPrayer?.name])}
              </span>
            </div>
            
            {timeUntilNext && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time remaining</span>
                  <span className="font-medium">{formatTimeUntil(timeUntilNext)}</span>
                </div>
                <Progress value={getProgressPercentage()} className="h-2 bg-white/20" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* All Prayer Times - compact list inside the same component */}
      <Card>
        <CardContent className="pt-4 space-y-1">
          {PRAYER_NAMES.map((prayer, index) => {
            const Icon = prayer.icon;
            const isNext = prayer.name === nextPrayer?.name;
            const adjustedTime = getAdjustedTime(prayer.name, prayerTimes[prayer.name]);
            const adjustment = adjustments.find(a => a.prayer_name === prayer.name);
            const hasAdjustment = adjustment && adjustment.adjustment_minutes !== 0;
            
            return (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                  isNext
                    ? `bg-gradient-to-r ${prayer.color} text-white shadow-md`
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isNext ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Icon className={`w-4 h-4 ${isNext ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isNext ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                      {prayer.name}
                    </div>
                    {hasAdjustment && (
                      <div className={`text-xs ${isNext ? 'text-white/70' : 'text-slate-400'}`}>
                        {adjustment.adjustment_minutes > 0 ? '+' : ''}{adjustment.adjustment_minutes}m offset
                      </div>
                    )}
                  </div>
                </div>
                <span className={`font-mono text-base font-bold ${isNext ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                  {adjustedTime}
                </span>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {settings?.location_city && (
        <p className="text-xs text-slate-400 text-center">
          Times for {settings.location_city}, {settings.location_country}
        </p>
      )}
    </div>
  );
}
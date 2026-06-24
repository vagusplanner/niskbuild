import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Loader2, Sun, Sunrise, CloudSun } from 'lucide-react';
import { motion } from 'framer-motion';

const PRAYER_ICONS = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sun,
  Isha: CloudSun
};

export default function TripPrayerTimesPanel({ destination, cities, compact = false }) {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState(null);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      setLoading(true);
      try {
        // Use primary destination or first city
        const location = cities?.[0]?.city || destination || 'Mecca, Saudi Arabia';
        setCurrentCity(location);

        const result = await SDK.integrations.Core.InvokeLLM({
          prompt: `Get today's prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) for ${location} using Islamic calculation method. Return exact times in HH:MM format.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              date: { type: 'string' },
              Fajr: { type: 'string' },
              Dhuhr: { type: 'string' },
              Asr: { type: 'string' },
              Maghrib: { type: 'string' },
              Isha: { type: 'string' }
            }
          }
        });
        setPrayerTimes(result);
      } catch (error) {
        console.error('Failed to fetch prayer times:', error);
      } finally {
        setLoading(false);
      }
    };

    if (destination || cities?.length) {
      fetchPrayerTimes();
    }
  }, [destination, cities]);

  const getCurrentPrayer = () => {
    if (!prayerTimes) return null;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (let i = 0; i < prayers.length; i++) {
      if (currentTime < prayerTimes[prayers[i]]) {
        return { name: prayers[i], time: prayerTimes[prayers[i]], isNext: true };
      }
    }
    return { name: 'Fajr', time: prayerTimes.Fajr, isNext: true }; // Tomorrow's Fajr
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        <span className="ml-2 text-sm text-slate-600">Loading prayer times...</span>
      </div>
    );
  }

  if (!prayerTimes) {
    return (
      <div className="p-6 text-center text-slate-500">
        Unable to load prayer times for this location
      </div>
    );
  }

  const nextPrayer = getCurrentPrayer();

  if (compact) {
    return (
      <div className="space-y-3">
        {currentCity && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <MapPin className="w-3 h-3" />
            <span>{currentCity}</span>
          </div>
        )}
        {nextPrayer && (
          <div className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-lg border border-teal-200 dark:border-teal-900">
            <p className="text-xs text-teal-700 dark:text-teal-300 font-semibold mb-1">Next Prayer</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-teal-700 dark:text-teal-200">{nextPrayer.name}</span>
              <span className="text-lg font-bold text-teal-600 dark:text-teal-300">{nextPrayer.time}</span>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
            const Icon = PRAYER_ICONS[prayer];
            const isNext = nextPrayer?.name === prayer;
            return (
              <div 
                key={prayer}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  isNext ? 'bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900' : 'bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${isNext ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span className={`text-sm font-medium ${isNext ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {prayer}
                  </span>
                </div>
                <span className={`text-sm font-bold ${isNext ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  {prayerTimes[prayer]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" />
            Prayer Times
          </CardTitle>
          {currentCity && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="w-3 h-3" />
              {currentCity}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextPrayer && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl text-white"
          >
            <p className="text-xs uppercase tracking-wider mb-2 text-teal-100">Next Prayer</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black">{nextPrayer.name}</span>
              <span className="text-2xl font-bold">{nextPrayer.time}</span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
            const Icon = PRAYER_ICONS[prayer];
            const isNext = nextPrayer?.name === prayer;
            return (
              <div 
                key={prayer}
                className={`p-4 rounded-xl border transition-all ${
                  isNext 
                    ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700' 
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${isNext ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span className={`text-sm font-semibold ${isNext ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {prayer}
                  </span>
                </div>
                <p className={`text-2xl font-black ${isNext ? 'text-teal-700 dark:text-teal-200' : 'text-slate-800 dark:text-slate-100'}`}>
                  {prayerTimes[prayer]}
                </p>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
          ℹ️ Prayer times are automatically adjusted for <strong>{currentCity}</strong>. Times update based on your travel destinations.
        </div>
      </CardContent>
    </Card>
  );
}
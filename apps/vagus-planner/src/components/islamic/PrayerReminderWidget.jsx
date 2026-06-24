import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Bell, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = ['🌅', '☀️', '🌤️', '🌆', '🌙'];

export default function PrayerReminderWidget() {
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [reminders, setReminders] = useState({
    Fajr: true,
    Dhuhr: true,
    Asr: true,
    Maghrib: true,
    Isha: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrayerTimes = async () => {
      try {
        const response = await fetch('https://api.aladhan.com/v1/today');
        const data = await response.json();
        const timings = data.data.timings;
        
        const times = {
          Fajr: timings.Fajr,
          Dhuhr: timings.Dhuhr,
          Asr: timings.Asr,
          Maghrib: timings.Maghrib,
          Isha: timings.Isha
        };

        setPrayerTimes(times);
        determineNextPrayer(times);
      } catch (error) {
        console.error('Error fetching prayer times:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrayerTimes();
    const interval = setInterval(fetchPrayerTimes, 60000);
    return () => clearInterval(interval);
  }, []);

  const determineNextPrayer = (times) => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const prayer of PRAYER_NAMES) {
      const [hours, minutes] = times[prayer].split(':').map(Number);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime > currentTime) {
        setNextPrayer(prayer);
        return;
      }
    }

    setNextPrayer(PRAYER_NAMES[0]);
  };

  const toggleReminder = (prayer) => {
    setReminders(prev => ({
      ...prev,
      [prayer]: !prev[prayer]
    }));
    toast.success(`${prayer} reminder ${reminders[prayer] ? 'disabled' : 'enabled'}`);
  };

  if (loading || !prayerTimes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Prayer Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-500">Loading prayer times...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Prayer Times & Reminders
          </CardTitle>
          {nextPrayer && (
            <Badge className="bg-amber-600 text-white">
              Next: {nextPrayer}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {PRAYER_NAMES.map((prayer, idx) => (
            <motion.div
              key={prayer}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`
                p-3 rounded-lg flex items-center justify-between
                ${prayer === nextPrayer 
                  ? 'bg-white border-2 border-amber-400 shadow-md' 
                  : 'bg-white/50 border border-amber-100'
                }
              `}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xl">{PRAYER_ICONS[idx]}</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{prayer}</p>
                  <p className="text-sm text-slate-600">{prayerTimes[prayer]}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleReminder(prayer)}
                className={`${reminders[prayer] ? 'text-amber-600' : 'text-slate-400'}`}
              >
                {reminders[prayer] ? (
                  <Bell className="w-4 h-4 fill-current" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Quick Reminder Settings */}
        <div className="mt-4 pt-4 border-t border-amber-200">
          <p className="text-xs font-semibold text-slate-700 mb-2">Default Reminder Time</p>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map(mins => (
              <Button
                key={mins}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                {mins}m
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
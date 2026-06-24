import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Moon, 
  Sun, 
  Clock, 
  Volume2, 
  AlertCircle,
  CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';

export default function IftarImsakAlarms() {
  const [imsakEnabled, setImsakEnabled] = useState(true);
  const [iftarEnabled, setIftarEnabled] = useState(true);
  const [alarmSound, setAlarmSound] = useState('adhan');
  const [nextAlarm, setNextAlarm] = useState(null);
  const [timeUntilAlarm, setTimeUntilAlarm] = useState(null);
  const [testingAlarm, setTestingAlarm] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};

  // Fetch today's prayer times for Maghrib (Iftar)
  const { data: prayerTimes } = useQuery({
    queryKey: ['todayPrayerTimes', userSettings.latitude, userSettings.longitude],
    queryFn: async () => {
      if (!userSettings.latitude || !userSettings.longitude) return null;
      
      const today = new Date();
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${Math.floor(today.getTime() / 1000)}?latitude=${userSettings.latitude}&longitude=${userSettings.longitude}&method=${userSettings.prayer_method || 'MWL'}`
      );
      const data = await response.json();
      return data.data?.timings;
    },
    enabled: !!userSettings.latitude && !!userSettings.longitude,
    refetchInterval: 60000 // Refresh every minute
  });

  // Calculate Imsak time (10 minutes before Fajr)
  const getImsakTime = () => {
    if (!prayerTimes?.Fajr) return null;
    
    const [hours, minutes] = prayerTimes.Fajr.split(':').map(Number);
    const fajrDate = new Date();
    fajrDate.setHours(hours, minutes - 10, 0, 0); // 10 min before Fajr
    return fajrDate;
  };

  const getIftarTime = () => {
    if (!prayerTimes?.Maghrib) return null;
    
    const [hours, minutes] = prayerTimes.Maghrib.split(':').map(Number);
    const maghribDate = new Date();
    maghribDate.setHours(hours, minutes, 0, 0);
    return maghribDate;
  };

  // Update next alarm and countdown
  useEffect(() => {
    const updateNextAlarm = () => {
      const now = new Date();
      const imsak = getImsakTime();
      const iftar = getIftarTime();

      let next = null;
      let type = null;

      if (imsak && imsakEnabled && imsak > now) {
        next = imsak;
        type = 'imsak';
      }

      if (iftar && iftarEnabled && iftar > now) {
        if (!next || iftar < next) {
          next = iftar;
          type = 'iftar';
        }
      }

      setNextAlarm(next ? { time: next, type } : null);

      if (next) {
        const minutesUntil = differenceInMinutes(next, now);
        setTimeUntilAlarm(minutesUntil);

        // Trigger alarm when time reaches
        if (minutesUntil === 0) {
          triggerAlarm(type);
        }
      }
    };

    updateNextAlarm();
    const interval = setInterval(updateNextAlarm, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [prayerTimes, imsakEnabled, iftarEnabled]);

  const triggerAlarm = (type) => {
    // Play sound
    if (alarmSound === 'adhan') {
      const audio = new Audio('https://www.islamcan.com/audio/adhan/adhan.mp3');
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 1000]);
    }

    // Show notification
    if (type === 'imsak') {
      toast.success('🌙 Imsak Time!', {
        description: 'Time to stop eating for Suhoor. Fajr prayer is approaching.',
        duration: 10000
      });
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🌙 Imsak Time', {
          body: 'Time to stop eating for Suhoor. Fajr prayer is approaching.',
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    } else if (type === 'iftar') {
      toast.success('🌅 Iftar Time!', {
        description: 'Time to break your fast. May Allah accept your fasting.',
        duration: 10000
      });
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🌅 Iftar Time', {
          body: 'Time to break your fast. May Allah accept your fasting.',
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    }
  };

  const testAlarm = () => {
    setTestingAlarm(true);
    const audio = new Audio('https://www.islamcan.com/audio/adhan/adhan.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => {
      toast.error('Could not play alarm sound');
    });

    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }

    toast.info('🔔 Test alarm playing', {
      description: 'This is how your Ramadan alarms will sound'
    });

    setTimeout(() => {
      audio.pause();
      setTestingAlarm(false);
    }, 3000);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled!');
      }
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-600" />
          Imsak & Iftar Alarms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Permission */}
        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Enable notifications to receive Ramadan alarms
                </p>
                <Button
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Enable Notifications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Next Alarm Info */}
        {nextAlarm && (
          <div className="p-4 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {nextAlarm.type === 'imsak' ? (
                  <Moon className="w-6 h-6" />
                ) : (
                  <Sun className="w-6 h-6" />
                )}
                <span className="font-bold text-lg capitalize">
                  Next {nextAlarm.type}
                </span>
              </div>
              <Badge className="bg-white/20 text-white border-white/30">
                {format(nextAlarm.time, 'h:mm a')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-cyan-100">
                {timeUntilAlarm > 60 
                  ? `${Math.floor(timeUntilAlarm / 60)} hours ${timeUntilAlarm % 60} minutes`
                  : `${timeUntilAlarm} minutes`
                } remaining
              </span>
            </div>
          </div>
        )}

        {/* Alarm Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-indigo-600" />
              <div>
                <Label className="text-base font-medium">Imsak Alarm</Label>
                <p className="text-sm text-slate-600">10 min before Fajr</p>
              </div>
            </div>
            <Switch
              checked={imsakEnabled}
              onCheckedChange={setImsakEnabled}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-orange-600" />
              <div>
                <Label className="text-base font-medium">Iftar Alarm</Label>
                <p className="text-sm text-slate-600">At Maghrib time</p>
              </div>
            </div>
            <Switch
              checked={iftarEnabled}
              onCheckedChange={setIftarEnabled}
            />
          </div>
        </div>

        {/* Prayer Times Display */}
        {prayerTimes && (
          <div className="p-4 bg-white rounded-lg border space-y-2">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Today's Times
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Fajr</span>
                <span className="font-medium text-slate-800">{prayerTimes.Fajr}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Maghrib</span>
                <span className="font-medium text-slate-800">{prayerTimes.Maghrib}</span>
              </div>
              {getImsakTime() && (
                <div className="flex items-center justify-between col-span-2 p-2 bg-indigo-50 rounded">
                  <span className="text-indigo-700 font-medium">Imsak (Stop Eating)</span>
                  <span className="font-bold text-indigo-900">{format(getImsakTime(), 'h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Test Alarm */}
        <Button
          onClick={testAlarm}
          disabled={testingAlarm}
          variant="outline"
          className="w-full border-purple-300 hover:bg-purple-50"
        >
          <Volume2 className="w-4 h-4 mr-2" />
          {testingAlarm ? 'Playing...' : 'Test Alarm Sound'}
        </Button>

        {/* Status Info */}
        <div className="text-xs text-slate-500 text-center">
          {imsakEnabled && iftarEnabled && (
            <div className="flex items-center justify-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />
              <span>Both alarms are active</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
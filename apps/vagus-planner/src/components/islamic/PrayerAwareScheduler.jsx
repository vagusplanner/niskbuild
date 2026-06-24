import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Calendar, Clock, MapPin, Sparkles, CheckCircle,
  AlertCircle, Loader2, RefreshCw, Zap, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parse, addMinutes, setHours, setMinutes } from 'date-fns';

const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_LABELS = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr', 
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha'
};

const PRAYER_COLORS = {
  fajr: 'from-indigo-500 to-purple-600',
  dhuhr: 'from-amber-400 to-orange-500',
  asr: 'from-yellow-500 to-amber-600',
  maghrib: 'from-rose-500 to-pink-600',
  isha: 'from-slate-700 to-slate-900'
};

export default function PrayerAwareScheduler() {
  const [enabled, setEnabled] = useState(false);
  const [syncingPrayers, setSyncingPrayers] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => base44.entities.UserSettings.list()
  });

  const userSettings = settings[0] || {};
  const islamicMode = userSettings.islamic_mode ?? false;

  // Fetch today's prayer times
  const { data: prayerData, isLoading: loadingPrayers } = useQuery({
    queryKey: ['prayerTimes', userSettings.latitude, userSettings.longitude],
    queryFn: async () => {
      if (!userSettings.latitude || !userSettings.longitude) return null;
      const res = await base44.functions.invoke('fetchPrayerTimes', {
        latitude: userSettings.latitude,
        longitude: userSettings.longitude,
        method: userSettings.prayer_method || 'MWL'
      });
      return res.data;
    },
    enabled: !!userSettings.latitude && !!userSettings.longitude && islamicMode,
    staleTime: 3600000 // 1 hour
  });

  // Fetch existing prayer events
  const { data: existingPrayerEvents = [] } = useQuery({
    queryKey: ['prayerEvents'],
    queryFn: () => base44.entities.Event.filter({ category: 'prayer' })
  });

  // Auto-block prayer times
  const blockPrayerTimesMutation = useMutation({
    mutationFn: async () => {
      if (!prayerData?.timings) return;
      
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Check which prayers already have events today
      const existingToday = existingPrayerEvents.filter(e => 
        e.start_date?.startsWith(todayStr)
      );
      const existingPrayerNames = existingToday.map(e => 
        e.title?.toLowerCase().replace(' prayer', '')
      );

      const events = [];
      for (const prayer of PRAYER_NAMES) {
        if (existingPrayerNames.includes(prayer)) continue;
        
        const timeStr = prayerData.timings[prayer.charAt(0).toUpperCase() + prayer.slice(1)];
        if (!timeStr) continue;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const startTime = setMinutes(setHours(today, hours), minutes);
        const endTime = addMinutes(startTime, prayer === 'fajr' ? 20 : 15);

        events.push({
          title: `${PRAYER_LABELS[prayer]} Prayer`,
          description: `Automated prayer time block`,
          start_date: startTime.toISOString(),
          end_date: endTime.toISOString(),
          is_all_day: false,
          category: 'prayer',
          color: '#9333ea',
          notes: 'Auto-created by Prayer Scheduler'
        });
      }

      if (events.length > 0) {
        await base44.entities.Event.bulkCreate(events);
      }
      
      return events.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['prayerEvents'] });
      if (count > 0) {
        toast.success(`${count} prayer time${count > 1 ? 's' : ''} blocked in calendar`);
      }
    }
  });

  // Suggest optimal meeting times
  const suggestMeetingTimesMutation = useMutation({
    mutationFn: async ({ duration }) => {
      const res = await base44.functions.invoke('suggestPrayerAwareMeetingTimes', {
        prayer_times: prayerData?.timings,
        buffer_minutes: bufferMinutes,
        duration_minutes: duration,
        date: format(new Date(), 'yyyy-MM-dd')
      });
      return res.data;
    }
  });

  const handleSyncPrayers = async () => {
    setSyncingPrayers(true);
    await blockPrayerTimesMutation.mutateAsync();
    setSyncingPrayers(false);
  };

  if (!islamicMode) {
    return (
      <Card className="border-amber-200 dark:border-amber-900">
        <CardContent className="p-6 text-center">
          <Moon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Enable Islamic Mode in Settings to use Prayer-Aware Scheduling</p>
        </CardContent>
      </Card>
    );
  }

  if (!userSettings.latitude || !userSettings.longitude) {
    return (
      <Card className="border-amber-200 dark:border-amber-900">
        <CardContent className="p-6 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-3">Set your location in Settings to enable prayer time calculation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 border-none text-white">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <Moon className="w-6 h-6" />
            <h2 className="text-lg font-bold">Prayer-Aware Scheduling</h2>
          </div>
          <p className="text-sm text-purple-100">
            AI automatically blocks prayer times and suggests optimal meeting slots around Salah
          </p>
        </CardContent>
      </Card>

      {/* Auto-Block Toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-600" />
                <Label className="font-semibold text-slate-700 dark:text-slate-300">Auto-Block Prayer Times</Label>
              </div>
              <p className="text-xs text-slate-500">
                Automatically add prayer times to your calendar daily to prevent scheduling conflicts
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Today's Prayer Times */}
      {loadingPrayers ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </CardContent>
        </Card>
      ) : prayerData?.timings ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-amber-600" />
              Today's Prayer Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PRAYER_NAMES.map(prayer => {
              const timeStr = prayerData.timings[prayer.charAt(0).toUpperCase() + prayer.slice(1)];
              const todayStr = format(new Date(), 'yyyy-MM-dd');
              const alreadyBlocked = existingPrayerEvents.some(e => 
                e.start_date?.startsWith(todayStr) && 
                e.title?.toLowerCase().includes(prayer)
              );

              return (
                <div key={prayer} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${PRAYER_COLORS[prayer]} text-white`}>
                  <div className="flex items-center gap-3">
                    <Moon className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-sm">{PRAYER_LABELS[prayer]}</p>
                      <p className="text-xs opacity-80">{timeStr}</p>
                    </div>
                  </div>
                  {alreadyBlocked && (
                    <Badge className="bg-white/20 text-white border-white/30">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={handleSyncPrayers}
          disabled={syncingPrayers || !prayerData}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {syncingPrayers ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Block Today's Prayers
            </>
          )}
        </Button>

        <Button
          onClick={() => suggestMeetingTimesMutation.mutate({ duration: 60 })}
          disabled={suggestMeetingTimesMutation.isPending || !prayerData}
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          {suggestMeetingTimesMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Suggest Meeting Times
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestions */}
      {suggestMeetingTimesMutation.data?.suggestions && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-teal-200 dark:border-teal-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-teal-600" />
                AI Meeting Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestMeetingTimesMutation.data.suggestions.map((slot, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-900">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{slot.time_range}</p>
                    <p className="text-xs text-slate-500">{slot.reason}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Buffer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4 text-slate-600" />
            Scheduling Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400">Buffer Time Around Prayers</Label>
            <div className="flex items-center gap-3 mt-2">
              {[10, 15, 20, 30].map(min => (
                <button
                  key={min}
                  onClick={() => setBufferMinutes(min)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                    bufferMinutes === min
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Additional time before/after prayer for preparation and post-prayer reflection
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">How it works:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>Prayer times update automatically based on your location</li>
                <li>AI prevents scheduling conflicts during Salah hours</li>
                <li>Meeting suggestions avoid prayer windows + buffer time</li>
                <li>Works seamlessly with your existing calendar events</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
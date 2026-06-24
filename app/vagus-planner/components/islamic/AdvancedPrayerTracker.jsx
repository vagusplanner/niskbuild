import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Calendar, TrendingUp, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, subDays } from 'date-fns';
import { offlineStorage } from '@/components/offline/offlineStorage';

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const PRAYER_COLORS = {
  Fajr: 'from-indigo-500 to-purple-600',
  Dhuhr: 'from-amber-400 to-orange-500',
  Asr: 'from-yellow-400 to-amber-500',
  Maghrib: 'from-orange-500 to-red-500',
  Isha: 'from-indigo-600 to-purple-700'
};

export default function AdvancedPrayerTracker() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs', selectedDate],
    queryFn: async () => {
      const logs = await base44.entities.PrayerLog.filter({
        date: selectedDate
      });
      return logs;
    }
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recentPrayerLogs'],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const logs = await base44.entities.PrayerLog.filter({});
      return logs.filter(log => log.date >= startDate);
    }
  });

  const logPrayerMutation = useMutation({
    mutationFn: async (data) => {
      if (navigator.onLine) {
        return base44.entities.PrayerLog.create(data);
      } else {
        await offlineStorage.init();
        await offlineStorage.addPrayerLog(data);
        return data;
      }
    },
    onMutate: async (newLog) => {
      await queryClient.cancelQueries({ queryKey: ['prayerLogs', selectedDate] });
      const previousLogs = queryClient.getQueryData(['prayerLogs', selectedDate]);
      
      queryClient.setQueryData(['prayerLogs', selectedDate], (old = []) => [
        ...old,
        { ...newLog, id: 'temp-' + Date.now(), created_date: new Date().toISOString() }
      ]);
      
      return { previousLogs };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['prayerLogs', selectedDate], context.previousLogs);
      toast.error('Failed to log prayer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayerLogs'] });
      queryClient.invalidateQueries({ queryKey: ['recentPrayerLogs'] });
      toast.success(navigator.onLine ? 'Prayer logged successfully' : 'Prayer logged offline');
    }
  });

  const updatePrayerMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrayerLog.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['prayerLogs', selectedDate] });
      const previousLogs = queryClient.getQueryData(['prayerLogs', selectedDate]);
      
      queryClient.setQueryData(['prayerLogs', selectedDate], (old = []) =>
        old.map(log => log.id === id ? { ...log, ...data } : log)
      );
      
      return { previousLogs };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['prayerLogs', selectedDate], context.previousLogs);
      toast.error('Failed to update prayer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayerLogs'] });
      queryClient.invalidateQueries({ queryKey: ['recentPrayerLogs'] });
      toast.success('Prayer status updated');
    }
  });

  const handleLogPrayer = (prayerName, status, onTime = true) => {
    const existingLog = prayerLogs.find(log => log.prayer_name === prayerName);
    
    if (existingLog) {
      updatePrayerMutation.mutate({
        id: existingLog.id,
        data: { status, prayed_on_time: onTime }
      });
    } else {
      logPrayerMutation.mutate({
        prayer_name: prayerName,
        date: selectedDate,
        status,
        prayed_on_time: onTime
      });
    }
  };

  const getPrayerStatus = (prayerName) => {
    return prayerLogs.find(log => log.prayer_name === prayerName);
  };

  const calculateStreak = () => {
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayLogs = recentLogs.filter(log => log.date === dateStr);
      const prayedCount = dayLogs.filter(log => log.status === 'prayed').length;
      
      if (prayedCount === 5) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const streak = calculateStreak();

  return (
    <div className="space-y-6">
      {/* Header with Streak */}
      <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-1">Prayer Tracker</h3>
              <p className="text-teal-100 text-sm">Track your daily prayers</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <Flame className="w-6 h-6 text-orange-300" />
                <span className="text-3xl font-bold">{streak}</span>
              </div>
              <p className="text-xs text-teal-100">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Prayer Cards */}
      <div className="grid gap-4">
        {PRAYERS.map((prayer, index) => {
          const status = getPrayerStatus(prayer);
          const isPrayed = status?.status === 'prayed';
          const isMissed = status?.status === 'missed';
          const onTime = status?.prayed_on_time;

          return (
            <motion.div
              key={prayer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border-2 transition-all ${
                isPrayed 
                  ? 'border-green-300 bg-green-50' 
                  : isMissed 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${PRAYER_COLORS[prayer]} flex items-center justify-center text-white font-bold shadow-lg`}>
                        {prayer[0]}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-lg">{prayer}</h4>
                        {status && (
                          <div className="flex items-center gap-2 mt-1">
                            {isPrayed && (
                              <>
                                <Badge className="bg-green-600 text-white text-xs">
                                  Prayed
                                </Badge>
                                {onTime && (
                                  <Badge variant="outline" className="text-xs border-green-600 text-green-700">
                                    On Time
                                  </Badge>
                                )}
                              </>
                            )}
                            {isMissed && (
                              <Badge className="bg-red-600 text-white text-xs">
                                Missed
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isPrayed ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : isMissed ? (
                      <XCircle className="w-8 h-8 text-red-600" />
                    ) : (
                      <Clock className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isPrayed && (
                      <>
                        <Button
                          onClick={() => handleLogPrayer(prayer, 'prayed', true)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          On Time
                        </Button>
                        <Button
                          onClick={() => handleLogPrayer(prayer, 'prayed', false)}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          size="sm"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Late
                        </Button>
                      </>
                    )}
                    {!isMissed && isPrayed && (
                      <Button
                        onClick={() => handleLogPrayer(prayer, 'missed', false)}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        size="sm"
                      >
                        Mark Missed
                      </Button>
                    )}
                    {isMissed && (
                      <Button
                        onClick={() => handleLogPrayer(prayer, 'prayed', false)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        Mark as Prayed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Today's Summary */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Today's Progress</p>
              <p className="text-2xl font-bold text-slate-800">
                {prayerLogs.filter(log => log.status === 'prayed').length} / 5 Prayers
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">On Time</p>
              <p className="text-2xl font-bold text-teal-600">
                {prayerLogs.filter(log => log.prayed_on_time).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
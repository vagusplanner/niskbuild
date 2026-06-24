import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Calendar as CalendarIcon, Bell, Baby, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInDays, startOfDay } from 'date-fns';

export default function FertilityTracker() {
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: false,
    daysBeforeOvulation: 2,
    timeOfDay: '09:00'
  });
  const [showSettings, setShowSettings] = useState(false);
  const queryClient = useQueryClient();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => SDK.entities.Period.list('-start_date', 12)
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => SDK.entities.UserSettings.list()
  });

  // Calculate ovulation and fertile window
  const calculateFertileWindow = () => {
    if (periods.length === 0) return null;

    const lastPeriod = periods[0];
    const cycleLength = lastPeriod.cycle_length || 28;
    const periodStartDate = new Date(lastPeriod.start_date);
    
    // Ovulation typically occurs 14 days before next period
    const ovulationDay = cycleLength - 14;
    const ovulationDate = addDays(periodStartDate, ovulationDay);
    
    // Fertile window: 5 days before ovulation + ovulation day
    const fertileWindowStart = addDays(ovulationDate, -5);
    const fertileWindowEnd = ovulationDate;
    
    // Next expected period
    const nextPeriodDate = addDays(periodStartDate, cycleLength);
    
    // Best conception days (2 days before ovulation to ovulation day)
    const bestDays = [
      addDays(ovulationDate, -2),
      addDays(ovulationDate, -1),
      ovulationDate
    ];

    return {
      ovulationDate,
      fertileWindowStart,
      fertileWindowEnd,
      nextPeriodDate,
      bestDays,
      cycleLength
    };
  };

  const fertilityData = calculateFertileWindow();
  const today = startOfDay(new Date());

  // Check if today is within fertile window
  const isInFertileWindow = fertilityData && 
    differenceInDays(today, startOfDay(fertilityData.fertileWindowStart)) >= 0 && 
    differenceInDays(today, startOfDay(fertilityData.fertileWindowEnd)) <= 0;

  // Check if today is a best day
  const isBestDay = fertilityData?.bestDays.some(
    day => differenceInDays(today, startOfDay(day)) === 0
  );

  // Calculate days until ovulation
  const daysUntilOvulation = fertilityData 
    ? differenceInDays(startOfDay(fertilityData.ovulationDate), today)
    : null;

  const saveNotificationSettings = useMutation({
    mutationFn: async (settings) => {
      // Save to user settings or notification preferences
      if (settings.enabled) {
        await SDK.entities.NotificationPreference.create({
          notification_type: 'fertility_reminder',
          enabled: true,
          advance_notice_minutes: settings.daysBeforeOvulation * 24 * 60,
          channels: [
            { channel: 'in_app', enabled: true },
            { channel: 'push', enabled: true }
          ]
        });
      }
      return settings;
    },
    onSuccess: () => {
      toast.success('Notification settings saved');
      setShowSettings(false);
      queryClient.invalidateQueries(['notificationPreferences']);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 border-pink-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Baby className="w-6 h-6 text-pink-600" />
                Fertility Tracker
              </CardTitle>
              <CardDescription className="text-pink-700 dark:text-pink-300">
                Track ovulation and fertile window for conception planning
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="gap-2"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </Button>
          </div>
        </CardHeader>
      </Card>

      {fertilityData ? (
        <>
          {/* Current Status */}
          {isBestDay && (
            <Card className="border-2 border-pink-500 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500 rounded-full">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-pink-900 dark:text-pink-100">
                      Peak Fertility Day!
                    </p>
                    <p className="text-sm text-pink-700 dark:text-pink-200">
                      Today is one of your best days for conception
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isInFertileWindow && !isBestDay && (
            <Card className="border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950 dark:to-pink-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-400 rounded-full">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-rose-900 dark:text-rose-100">
                      Fertile Window
                    </p>
                    <p className="text-sm text-rose-700 dark:text-rose-200">
                      You're currently in your fertile window
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ovulation Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Ovulation Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">
                  {format(fertilityData.ovulationDate, 'MMM dd')}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {daysUntilOvulation > 0 
                    ? `In ${daysUntilOvulation} days`
                    : daysUntilOvulation === 0
                    ? 'Today!'
                    : `${Math.abs(daysUntilOvulation)} days ago`
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Fertile Window
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-rose-600">
                  {format(fertilityData.fertileWindowStart, 'MMM dd')} - {format(fertilityData.fertileWindowEnd, 'MMM dd')}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  6 days total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Next Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {format(fertilityData.nextPeriodDate, 'MMM dd')}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Expected in {differenceInDays(startOfDay(fertilityData.nextPeriodDate), today)} days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Best Days for Conception */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-600" />
                Best Days for Conception
              </CardTitle>
              <CardDescription>
                Highest probability of conception during these days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {fertilityData.bestDays.map((day, index) => {
                  const isToday = differenceInDays(today, startOfDay(day)) === 0;
                  const isPast = differenceInDays(today, startOfDay(day)) > 0;
                  
                  return (
                    <Badge
                      key={index}
                      variant={isToday ? 'default' : 'outline'}
                      className={cn(
                        'px-4 py-2 text-base',
                        isToday && 'bg-pink-500 text-white animate-pulse',
                        isPast && 'opacity-50'
                      )}
                    >
                      {format(day, 'EEE, MMM dd')}
                      {isToday && ' (Today!)'}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-sm text-slate-500 mt-4">
                💡 Tip: For best results, try to conceive on the 2 days before ovulation and on ovulation day.
              </p>
            </CardContent>
          </Card>

          {/* Cycle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
                Cycle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Cycle Length</span>
                  <span className="font-semibold">{fertilityData.cycleLength} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Last Period Started</span>
                  <span className="font-semibold">{format(new Date(periods[0].start_date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Tracking Accuracy</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {periods.length >= 3 ? 'High' : periods.length >= 2 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
              </div>
              {periods.length < 3 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  Track at least 3 cycles for more accurate predictions
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No period data available yet
            </p>
            <p className="text-sm text-slate-500">
              Start tracking your period in the Period tab to see fertility predictions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fertility Notification Settings</DialogTitle>
            <DialogDescription>
              Get reminders before your fertile window begins
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-xs text-slate-500 mt-1">
                  Get notified about fertile days
                </p>
              </div>
              <Switch
                checked={notificationSettings.enabled}
                onCheckedChange={(checked) => 
                  setNotificationSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {notificationSettings.enabled && (
              <>
                <div className="space-y-2">
                  <Label>Notify me (days before ovulation)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={notificationSettings.daysBeforeOvulation}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({ 
                        ...prev, 
                        daysBeforeOvulation: parseInt(e.target.value) || 2 
                      }))
                    }
                  />
                  <p className="text-xs text-slate-500">
                    Recommended: 2-3 days before ovulation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Notification Time</Label>
                  <Input
                    type="time"
                    value={notificationSettings.timeOfDay}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({ 
                        ...prev, 
                        timeOfDay: e.target.value 
                      }))
                    }
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-pink-600 hover:bg-pink-700"
              onClick={() => saveNotificationSettings.mutate(notificationSettings)}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
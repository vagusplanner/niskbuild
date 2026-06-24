import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function PrayerTimeAutoAdjust() {
  const [conflicts, setConflicts] = useState([]);
  const [autoAdjusting, setAutoAdjusting] = useState(false);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const { data: prayerLogs = [] } = useQuery({
    queryKey: ['prayerLogs'],
    queryFn: () => SDK.entities.PrayerLog?.list?.() || Promise.resolve([])
  });

  const prayerTimes = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const prayerHours = { Fajr: 5, Dhuhr: 12, Asr: 15, Maghrib: 18, Isha: 20 };

  useEffect(() => {
    detectConflicts();
  }, [events]);

  const detectConflicts = () => {
    const newConflicts = [];

    events.forEach(event => {
      const eventStart = new Date(event.start_date);
      const eventHour = eventStart.getHours();

      prayerTimes.forEach(prayer => {
        const prayerHour = prayerHours[prayer];
        const timeDiff = Math.abs(eventHour - prayerHour);

        // Flag if event is within 1 hour of prayer time
        if (timeDiff < 1 && event.category !== 'prayer') {
          newConflicts.push({
            id: `${event.id}-${prayer}`,
            event,
            prayer,
            prayerTime: new Date(eventStart).setHours(prayerHour, 0, 0, 0)
          });
        }
      });
    });

    setConflicts(newConflicts);
  };

  const handleAutoAdjust = async () => {
    setAutoAdjusting(true);
    try {
      for (const conflict of conflicts) {
        const newStart = new Date(conflict.prayerTime);
        newStart.setHours(newStart.getHours() + 2); // Move 2 hours after prayer

        const duration = new Date(conflict.event.end_date) - new Date(conflict.event.start_date);
        const newEnd = new Date(newStart.getTime() + duration);

        await SDK.entities.Event.update(conflict.event.id, {
          start_date: newStart.toISOString(),
          end_date: newEnd.toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['events'] });
      setConflicts([]);
      toast.success(`Auto-adjusted ${conflicts.length} event(s) to avoid prayer times`);
    } catch (err) {
      toast.error('Failed to auto-adjust events');
      console.error(err);
    } finally {
      setAutoAdjusting(false);
    }
  };

  const handleManualAdjust = (conflictId) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (conflict) {
      toast.success(`Manually adjust "${conflict.event.title}" to avoid ${conflict.prayer}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950 to-teal-50 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Prayer Time Auto-Adjust
          </CardTitle>
          <CardDescription>Automatically move events that conflict with prayer times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflicts.length > 0 ? (
            <>
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {conflicts.length} event{conflicts.length !== 1 ? 's' : ''} conflict{conflicts.length !== 1 ? 's' : ''} with prayer times
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    These will be automatically moved after prayers
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {conflicts.map(conflict => (
                  <motion.div
                    key={conflict.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                          {conflict.event.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Conflicts with {conflict.prayer} ({new Date(conflict.prayerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={handleAutoAdjust}
                disabled={autoAdjusting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {autoAdjusting ? 'Adjusting...' : `Auto-Adjust ${conflicts.length} Event${conflicts.length !== 1 ? 's' : ''}`}
              </Button>
            </>
          ) : (
            <div className="p-4 text-center">
              <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No conflicts with prayer times ✓
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Watch, Clock, MapPin, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SmartWatchDashboard() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  // Get next 3 events
  const nextEvents = events
    .filter(e => new Date(e.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 3);

  const currentEvent = events.find(e => {
    const now = new Date();
    const start = new Date(e.start_date);
    const end = new Date(e.end_date);
    return now >= start && now <= end;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-gradient-to-br from-indigo-50 dark:from-indigo-950 to-purple-50 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Watch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Smart Watch
          </CardTitle>
          <CardDescription>Optimized view for wearables and quick glances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Event */}
          {currentEvent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-100 dark:bg-red-900 rounded-lg border-2 border-red-500 text-center"
            >
              <p className="text-xs text-red-900 dark:text-red-100 font-bold uppercase mb-1">Now</p>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">{currentEvent.title}</p>
              <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                {new Date(currentEvent.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </motion.div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="h-14 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              onClick={() => navigator.vibrate(50)}
            >
              🔔 Snooze
            </Button>
            <Button
              className="h-14 text-sm font-bold bg-slate-600 hover:bg-slate-700 rounded-lg"
              onClick={() => navigator.vibrate([100, 50, 100])}
            >
              ✓ Done
            </Button>
          </div>

          {/* Next Events - Large, Touchable */}
          <div className="space-y-2">
            {nextEvents.map((event, idx) => {
              const startTime = new Date(event.start_date);
              const hoursUntil = Math.round((startTime - new Date()) / (1000 * 60 * 60));
              return (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="w-full p-3 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-700 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors active:scale-95"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                        {event.title}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {hoursUntil <= 1 && (
                      <div className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-xs font-bold whitespace-nowrap">
                        {hoursUntil === 0 ? 'Soon!' : 'Soon'}
                      </div>
                    )}
                  </div>

                  {event.location && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            <p>💡 Tap events for details</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
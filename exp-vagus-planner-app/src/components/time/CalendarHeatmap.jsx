import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CalendarHeatmap() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => SDK.entities.Event.list()
  });

  const heatmapData = useMemo(() => {
    // Create a 7-week heatmap
    const data = [];
    const today = new Date();
    
    for (let week = -6; week <= 0; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() + week * 7 + day);
        
        const dayEvents = events.filter(e => {
          const eventDate = new Date(e.start_date);
          return eventDate.toDateString() === date.toDateString();
        });
        
        const totalHours = dayEvents.reduce((sum, e) => {
          return sum + (new Date(e.end_date) - new Date(e.start_date)) / (1000 * 60 * 60);
        }, 0);
        
        data.push({
          date: date.toDateString().slice(0, 10),
          hours: Math.round(totalHours * 10) / 10,
          eventCount: dayEvents.length,
          intensity: totalHours === 0 ? 0 : Math.min(4, Math.ceil(totalHours / 2))
        });
      }
    }
    
    return data;
  }, [events]);

  const getColor = (intensity) => {
    const colors = {
      0: 'bg-slate-100 dark:bg-slate-800',
      1: 'bg-teal-200 dark:bg-teal-800',
      2: 'bg-teal-400 dark:bg-teal-600',
      3: 'bg-teal-600 dark:bg-teal-500',
      4: 'bg-teal-800 dark:bg-teal-400'
    };
    return colors[intensity] || colors[0];
  };

  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  const getIntensityLabel = (hours) => {
    if (hours === 0) return 'Free';
    if (hours < 3) return 'Light';
    if (hours < 6) return 'Moderate';
    if (hours < 9) return 'Busy';
    return 'Very Busy';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Calendar Heatmap
          </CardTitle>
          <CardDescription>Visualize your busy and free patterns over 7 weeks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {weeks.map((week, weekIdx) => (
            <motion.div
              key={weekIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: weekIdx * 0.05 }}
              className="space-y-2"
            >
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Week {weekIdx + 1}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {week.map((day, dayIdx) => (
                  <motion.div
                    key={dayIdx}
                    whileHover={{ scale: 1.1 }}
                    title={`${day.date}: ${day.hours}h (${day.eventCount} events) - ${getIntensityLabel(day.hours)}`}
                    className={`aspect-square rounded-md cursor-pointer transition-all ${getColor(day.intensity)} hover:ring-2 hover:ring-teal-500 dark:hover:ring-teal-400`}
                  >
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 opacity-0 hover:opacity-100 transition-opacity">
                      {day.hours}h
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Legend</p>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((intensity) => (
                <div key={intensity} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md ${getColor(intensity)}`} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{getIntensityLabel(intensity)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">Most Busy Day</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {heatmapData.reduce((max, d) => d.hours > max.hours ? d : max).date}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">Busiest Week</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {Math.max(
                  ...weeks.map(w => w.reduce((sum, d) => sum + d.hours, 0))
                ).toFixed(0)}h
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">Avg/Week</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {(heatmapData.reduce((sum, d) => sum + d.hours, 0) / weeks.length).toFixed(0)}h
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
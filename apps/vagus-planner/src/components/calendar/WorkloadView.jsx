import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WorkloadView({ currentDate, events, onDateClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getWorkloadForDay = (day) => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_date), day)
    );

    const totalMinutes = dayEvents.reduce((acc, event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return acc + (end - start) / (1000 * 60);
    }, 0);

    return {
      count: dayEvents.length,
      totalHours: totalMinutes / 60,
      events: dayEvents
    };
  };

  const getIntensityColor = (hours) => {
    if (hours === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (hours <= 2) return 'bg-green-200 dark:bg-green-900';
    if (hours <= 4) return 'bg-yellow-300 dark:bg-yellow-800';
    if (hours <= 6) return 'bg-orange-400 dark:bg-orange-700';
    return 'bg-red-500 dark:bg-red-600';
  };

  const getIntensityLabel = (hours) => {
    if (hours === 0) return { label: 'Free', icon: Minus, color: 'text-slate-500' };
    if (hours <= 2) return { label: 'Light', icon: TrendingDown, color: 'text-green-600' };
    if (hours <= 4) return { label: 'Moderate', icon: Minus, color: 'text-yellow-600' };
    if (hours <= 6) return { label: 'Busy', icon: TrendingUp, color: 'text-orange-600' };
    return { label: 'Overloaded', icon: AlertCircle, color: 'text-red-600' };
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totalHours = events.reduce((acc, event) => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return acc + (end - start) / (1000 * 60 * 60);
  }, 0);

  const avgHoursPerDay = (totalHours / days.length).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{events.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalHours.toFixed(1)}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Avg Per Day</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{avgHoursPerDay}h</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Busiest Day</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {Math.max(...days.map(d => getWorkloadForDay(d).totalHours)).toFixed(1)}h
          </p>
        </Card>
      </div>

      {/* Heatmap Calendar */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {format(currentDate, 'MMMM yyyy')} Workload Heatmap
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualize your busiest days
          </p>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-600 dark:text-slate-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          
          {/* Actual days */}
          {days.map((day, index) => {
            const workload = getWorkloadForDay(day);
            const intensity = getIntensityLabel(workload.totalHours);
            const Icon = intensity.icon;

            return (
              <motion.button
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => onDateClick?.(day)}
                className={`
                  aspect-square rounded-lg p-1 transition-all hover:scale-110 hover:shadow-lg
                  ${getIntensityColor(workload.totalHours)}
                  ${isToday(day) ? 'ring-2 ring-teal-500 dark:ring-teal-400' : ''}
                  relative group
                `}
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {format(day, 'd')}
                </div>
                
                {workload.count > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-300 dark:border-slate-600">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {workload.count}
                    </span>
                  </div>
                )}

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  <div className="font-semibold">{format(day, 'MMM d')}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Icon className={`w-3 h-3 ${intensity.color}`} />
                    {intensity.label}: {workload.totalHours.toFixed(1)}h
                  </div>
                  <div>{workload.count} event{workload.count !== 1 ? 's' : ''}</div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Workload Intensity</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Light (&lt;2h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-300 dark:bg-yellow-800" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Moderate (2-4h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-700" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Busy (4-6h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500 dark:bg-red-600" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Overloaded (&gt;6h)</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
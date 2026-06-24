import React from 'react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function HabitHeatmap({ habit, completions }) {
  const today = startOfDay(new Date());
  const days = eachDayOfInterval({ start: subDays(today, 62), end: today });

  const isCompleted = (date) => {
    const ds = format(date, 'yyyy-MM-dd');
    return completions.some(c => c.habit_id === habit.id && c.completion_date === ds);
  };

  const weeks = [];
  let week = [];
  // pad first week
  const firstDay = days[0].getDay();
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push(week);

  return (
    <div className="flex gap-1 overflow-x-auto">
      {weeks.map((w, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {w.map((day, di) => (
            <div
              key={di}
              title={day ? format(day, 'MMM d') : ''}
              className={cn(
                "w-3.5 h-3.5 rounded-sm",
                !day ? "opacity-0" :
                isCompleted(day)
                  ? "bg-teal-500 shadow-sm shadow-teal-300"
                  : "bg-slate-200 dark:bg-slate-700"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
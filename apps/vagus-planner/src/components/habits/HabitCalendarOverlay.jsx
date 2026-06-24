import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

export default function HabitCalendarOverlay({ date }) {
  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.list()
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habitCompletions'],
    queryFn: () => base44.entities.HabitCompletion.list('-completion_date', 500)
  });

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay();

  // Filter habits that should appear on this date
  const habitsForDate = habits.filter(habit => {
    if (!habit.is_active) return false;
    
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') {
      return habit.target_days?.includes(dayOfWeek);
    }
    if (habit.frequency === 'monthly') {
      return date.getDate() === habit.target_day_of_month;
    }
    return false;
  });

  const completedHabits = habitsForDate.filter(habit =>
    completions.some(c => c.habit_id === habit.id && c.completion_date === dateStr)
  );

  if (habitsForDate.length === 0) return null;

  return (
    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
      <div className="flex gap-0.5">
        {habitsForDate.slice(0, 3).map(habit => {
          const isCompleted = completedHabits.some(ch => ch.id === habit.id);
          return (
            <div
              key={habit.id}
              className={`w-1.5 h-1.5 rounded-full ${
                isCompleted 
                  ? 'bg-green-500' 
                  : 'bg-slate-300 dark:bg-slate-600'
              }`}
              title={habit.name}
            />
          );
        })}
      </div>
      {completedHabits.length === habitsForDate.length && habitsForDate.length > 0 && (
        <CheckCircle2 className="w-3 h-3 text-green-600" />
      )}
    </div>
  );
}
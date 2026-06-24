import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Star, Heart } from 'lucide-react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SUNNAH_HABITS = [
  { id: 'monday_fast', name: 'Monday Fasting', icon: '🌙', frequency: 'weekly', day: 1 },
  { id: 'thursday_fast', name: 'Thursday Fasting', icon: '🌙', frequency: 'weekly', day: 4 },
  { id: 'white_days', name: 'White Days (13,14,15)', icon: '⭐', frequency: 'monthly' },
  { id: 'tahajjud', name: 'Night Prayer (Tahajjud)', icon: '🌟', frequency: 'daily' },
  { id: 'morning_adhkar', name: 'Morning Adhkar', icon: '🌅', frequency: 'daily' },
  { id: 'evening_adhkar', name: 'Evening Adhkar', icon: '🌆', frequency: 'daily' },
  { id: 'duha', name: 'Duha Prayer', icon: '☀️', frequency: 'daily' },
  { id: 'quran_daily', name: 'Daily Quran Reading', icon: '📖', frequency: 'daily' }
];

export default function SunnahHabitTracker() {
  const queryClient = useQueryClient();

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => SDK.entities.Habit.list()
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habitCompletions'],
    queryFn: () => SDK.entities.HabitCompletion.list()
  });

  const toggleHabitMutation = useMutation({
    mutationFn: async ({ habitId, date }) => {
      const existing = completions.find(c => 
        c.habit_id === habitId && c.completion_date === date
      );

      if (existing) {
        await SDK.entities.HabitCompletion.delete(existing.id);
      } else {
        await SDK.entities.HabitCompletion.create({
          habit_id: habitId,
          completion_date: date,
          count: 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitCompletions'] });
      toast.success('Progress updated!');
    }
  });

  const createSunnahHabitMutation = useMutation({
    mutationFn: (habit) => SDK.entities.Habit.create(habit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const today = new Date().toISOString().split('T')[0];

  const isCompletedToday = (habitId) => {
    return completions.some(c => 
      c.habit_id === habitId && c.completion_date === today
    );
  };

  const initializeSunnahHabits = async () => {
    for (const sunnah of SUNNAH_HABITS) {
      await createSunnahHabitMutation.mutateAsync({
        name: sunnah.name,
        frequency: sunnah.frequency === 'monthly' ? 'monthly' : sunnah.frequency === 'weekly' ? 'weekly' : 'daily',
        target_days: sunnah.day ? [sunnah.day] : undefined,
        category: 'spiritual',
        icon: sunnah.icon
      });
    }
    toast.success('Sunnah habits initialized!');
  };

  const sunnahHabits = habits.filter(h => h.category === 'spiritual');

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-600" />
            Sunnah Habits
          </div>
          {sunnahHabits.length === 0 && (
            <button
              onClick={initializeSunnahHabits}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              + Add All
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sunnahHabits.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Track your Sunnah habits</p>
          </div>
        ) : (
          sunnahHabits.map((habit) => {
            const completed = isCompletedToday(habit.id);
            return (
              <label
                key={habit.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  completed
                    ? 'bg-amber-100 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-amber-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={completed}
                  onChange={() => toggleHabitMutation.mutate({ habitId: habit.id, date: today })}
                  className="w-5 h-5"
                />
                <span className="text-2xl">{habit.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{habit.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {habit.frequency}
                  </Badge>
                </div>
                {completed && <Heart className="w-5 h-5 text-amber-600 fill-amber-600" />}
              </label>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
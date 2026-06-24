import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Dumbbell, Utensils, Smile, Moon, Check } from 'lucide-react';

export default function WellnessCalendarOverlay({ date }) {
  const dateStr = format(date, 'yyyy-MM-dd');

  // Fetch wellness data for this date
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises', dateStr],
    queryFn: () => base44.entities.Exercise.filter({ date: dateStr })
  });

  const { data: nutrition = [] } = useQuery({
    queryKey: ['nutrition', dateStr],
    queryFn: () => base44.entities.Nutrition.filter({ date: dateStr })
  });

  const { data: moods = [] } = useQuery({
    queryKey: ['moods', dateStr],
    queryFn: () => base44.entities.Mood.filter({ date: dateStr })
  });

  const { data: sleeps = [] } = useQuery({
    queryKey: ['sleep', dateStr],
    queryFn: () => base44.entities.Sleep.filter({ date: dateStr })
  });

  const hasExercise = exercises.length > 0;
  const hasNutrition = nutrition.length > 0;
  const hasMood = moods.length > 0;
  const hasSleep = sleeps.length > 0;

  const indicators = [
    { active: hasExercise, color: 'bg-orange-500', Icon: Dumbbell },
    { active: hasNutrition, color: 'bg-green-500', Icon: Utensils },
    { active: hasMood, color: 'bg-yellow-500', Icon: Smile },
    { active: hasSleep, color: 'bg-purple-500', Icon: Moon }
  ].filter(i => i.active);

  if (indicators.length === 0) return null;

  const allComplete = hasExercise && hasNutrition && hasMood && hasSleep;

  return (
    <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-0.5">
      {allComplete ? (
        <div className="p-1 rounded-full bg-teal-500 shadow-sm">
          <Check className="w-2 h-2 text-white" />
        </div>
      ) : (
        indicators.slice(0, 3).map((indicator, idx) => {
          const Icon = indicator.Icon;
          return (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${indicator.color} shadow-sm`}
            />
          );
        })
      )}
    </div>
  );
}
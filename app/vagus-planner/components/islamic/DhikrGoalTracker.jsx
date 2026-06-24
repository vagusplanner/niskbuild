import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, RotateCcw, Flame } from 'lucide-react';
import { toast } from 'sonner';

export default function DhikrGoalTracker() {
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['dhikrGoals'],
    queryFn: () => base44.entities.DhikrGoal.list()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DhikrGoal.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['dhikrGoals'] });
      const previousGoals = queryClient.getQueryData(['dhikrGoals']);
      
      queryClient.setQueryData(['dhikrGoals'], (old = []) =>
        old.map(goal => goal.id === id ? { ...goal, ...data } : goal)
      );
      
      return { previousGoals };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['dhikrGoals'], context.previousGoals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dhikrGoals'] });
    }
  });

  const incrementCount = (goal, amount = 1) => {
    const newCount = (goal.current_count || 0) + amount;
    const isComplete = newCount >= goal.daily_target;
    
    updateMutation.mutate({
      id: goal.id,
      data: {
        current_count: newCount,
        last_updated: new Date().toISOString(),
        total_completed: (goal.total_completed || 0) + amount
      }
    });

    if (isComplete && newCount === goal.daily_target) {
      toast.success('🎉 Daily goal completed!');
    }
  };

  const resetDaily = (goal) => {
    const today = new Date().toDateString();
    const lastUpdated = goal.last_updated ? new Date(goal.last_updated).toDateString() : null;
    const isNewDay = today !== lastUpdated;

    if (isNewDay && goal.current_count >= goal.daily_target) {
      updateMutation.mutate({
        id: goal.id,
        data: {
          current_count: 0,
          streak_days: (goal.streak_days || 0) + 1,
          last_updated: new Date().toISOString()
        }
      });
    } else {
      updateMutation.mutate({
        id: goal.id,
        data: {
          current_count: 0,
          last_updated: new Date().toISOString()
        }
      });
    }
  };

  const getDhikrText = (type) => {
    const texts = {
      subhanallah: 'سُبْحَانَ اللهِ',
      alhamdulillah: 'الْحَمْدُ لِلَّهِ',
      allahu_akbar: 'اللهُ أَكْبَرُ',
      la_ilaha_illallah: 'لَا إِلٰهَ إِلَّا الله',
      astaghfirullah: 'أَسْتَغْفِرُ اللهَ',
      salawat: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ'
    };
    return texts[type] || type;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          📿 Dhikr Goals Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No dhikr goals yet. Add one to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min((goal.current_count / goal.daily_target) * 100, 100);
              const isComplete = goal.current_count >= goal.daily_target;

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border-2 ${
                    isComplete ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-purple-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getDhikrText(goal.dhikr_type)}</div>
                      {goal.streak_days > 0 && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          <Flame className="w-3 h-3 mr-1" />
                          {goal.streak_days}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-900">
                        {goal.current_count}/{goal.daily_target}
                      </div>
                      <div className="text-xs text-slate-500">
                        Total: {goal.total_completed || 0}
                      </div>
                    </div>
                  </div>

                  <Progress value={progress} className="h-2 mb-3" />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => incrementCount(goal, 1)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      +1
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => incrementCount(goal, 10)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      +10
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => incrementCount(goal, 33)}
                      variant="outline"
                      className="flex-1 border-purple-300"
                    >
                      +33
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resetDaily(goal)}
                      variant="outline"
                      className="border-slate-300"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
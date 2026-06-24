import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Plus, 
  TrendingUp,
  X,
  Pin,
  PinOff,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import HabitForm from './HabitForm';
import HabitAnalytics from './HabitAnalytics';

const categoryColors = {
  health: 'bg-green-100 text-green-700 border-green-300',
  fitness: 'bg-orange-100 text-orange-700 border-orange-300',
  productivity: 'bg-blue-100 text-blue-700 border-blue-300',
  learning: 'bg-purple-100 text-purple-700 border-purple-300',
  spiritual: 'bg-teal-100 text-teal-700 border-teal-300',
  social: 'bg-pink-100 text-pink-700 border-pink-300',
  other: 'bg-slate-100 text-slate-700 border-slate-300'
};

export default function HabitTrackerPanel({ selectedDate, isPinned, onTogglePin, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.list('-created_date')
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habitCompletions'],
    queryFn: () => base44.entities.HabitCompletion.list('-completion_date', 500)
  });

  const toggleCompletionMutation = useMutation({
    mutationFn: ({ habit, date, isCompleting }) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = completions.find(c => 
        c.habit_id === habit.id && c.completion_date === dateStr
      );

      if (isCompleting && !existing) {
        return base44.entities.HabitCompletion.create({
          habit_id: habit.id,
          completion_date: dateStr,
          count: 1
        });
      } else if (!isCompleting && existing) {
        return base44.entities.HabitCompletion.delete(existing.id);
      }
    },
    onMutate: async ({ habit, date, isCompleting }) => {
      await queryClient.cancelQueries({ queryKey: ['habitCompletions'] });
      const previous = queryClient.getQueryData(['habitCompletions']);
      const dateStr = format(date, 'yyyy-MM-dd');
      queryClient.setQueryData(['habitCompletions'], (old = []) => {
        const existing = old.find(c => c.habit_id === habit.id && c.completion_date === dateStr);
        if (isCompleting && !existing) {
          return [...old, { habit_id: habit.id, completion_date: dateStr, count: 1, id: `temp-${Date.now()}` }];
        } else if (!isCompleting && existing) {
          return old.filter(c => !(c.habit_id === habit.id && c.completion_date === dateStr));
        }
        return old;
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['habitCompletions'], context?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitCompletions'] });
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: (id) => base44.entities.Habit.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['habits'] });
      const previous = queryClient.getQueryData(['habits']);
      queryClient.setQueryData(['habits'], (old = []) => old.filter(h => h.id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['habits'], context?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  useEffect(() => {
    if (isPinned) return;
    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsExpanded(false), 3000);
    };
    if (isExpanded) resetTimeout();
    return () => clearTimeout(timeout);
  }, [isExpanded, isPinned]);

  const activeHabits = habits.filter(h => h.is_active);
  
  const getTodayHabits = () => {
    return activeHabits.filter(habit => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly') {
        return habit.target_days?.includes(dayOfWeek);
      }
      if (habit.frequency === 'monthly') {
        return today.getDate() === habit.target_day_of_month;
      }
      return false;
    });
  };

  const isHabitCompleted = (habit, date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return completions.some(c => 
      c.habit_id === habit.id && c.completion_date === dateStr
    );
  };

  const getCompletionRate = (habit) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    });

    const relevantDays = last7Days.filter(date => {
      const dayOfWeek = date.getDay();
      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly') {
        return habit.target_days?.includes(dayOfWeek);
      }
      return false;
    });

    const completed = relevantDays.filter(date => isHabitCompleted(habit, date)).length;
    return relevantDays.length > 0 ? (completed / relevantDays.length) * 100 : 0;
  };

  const todayHabits = getTodayHabits();
  const completedToday = todayHabits.filter(h => isHabitCompleted(h, new Date())).length;
  const shouldShowExpanded = isPinned || isExpanded;

  return (
    <>
      <motion.div
        className={cn(
          "border-l border-slate-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900 relative h-full overflow-hidden",
          "transition-all duration-300 ease-in-out"
        )}
        initial={false}
        animate={{ width: shouldShowExpanded ? 320 : 56 }}
        onMouseEnter={() => !isPinned && setIsExpanded(true)}
        onMouseLeave={() => !isPinned && setIsExpanded(false)}
      >
        <AnimatePresence>
          {!shouldShowExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center py-4 gap-3"
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <Target className="w-5 h-5 text-teal-600" />
                <Badge className="text-[10px] px-1.5 py-0.5">{completedToday}/{todayHabits.length}</Badge>
              </div>
              
              {todayHabits.length > 0 && (
                <div className="w-10 px-1">
                  <Progress 
                    value={(completedToday / todayHabits.length) * 100} 
                    className="h-1.5"
                  />
                </div>
              )}
              
              <div className="mt-auto space-y-2 pb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingHabit(null);
                    setShowForm(true);
                  }}
                  className="w-9 h-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAnalytics(true)}
                  className="w-9 h-9 text-violet-600"
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {shouldShowExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              <Card className="h-full flex flex-col border-0 rounded-none shadow-none">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-teal-600" />
                      Habits
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {onClose && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onClose}
                          className="lg:hidden h-8 w-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onTogglePin}
                        className={cn(
                          "h-8 w-8 hidden lg:flex",
                          isPinned && "text-teal-600 bg-teal-50 dark:bg-teal-950"
                        )}
                      >
                        {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowAnalytics(true)}
                        className="h-8 w-8 text-violet-600"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => {
                          setEditingHabit(null);
                          setShowForm(true);
                        }}
                        className="h-8 w-8 bg-teal-600 hover:bg-teal-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Today's Progress</span>
                      <Badge variant="outline">{completedToday}/{todayHabits.length}</Badge>
                    </div>
                    <Progress 
                      value={todayHabits.length > 0 ? (completedToday / todayHabits.length) * 100 : 0} 
                      className="h-2"
                    />
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0">
                  {isLoading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : todayHabits.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No habits scheduled for today</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {todayHabits.map(habit => {
                        const completed = isHabitCompleted(habit, new Date());
                        const rate = getCompletionRate(habit);
                        
                        return (
                          <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={completed}
                                onCheckedChange={(checked) => {
                                  toggleCompletionMutation.mutate({
                                    habit,
                                    date: new Date(),
                                    isCompleting: checked
                                  });
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={cn(
                                    "text-sm font-medium",
                                    completed && "line-through text-slate-500"
                                  )}>
                                    {habit.name}
                                  </p>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", categoryColors[habit.category])}
                                  >
                                    {habit.category}
                                  </Badge>
                                </div>
                                {habit.description && (
                                  <p className="text-xs text-slate-500 mb-2">{habit.description}</p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Progress value={rate} className="h-1 flex-1" />
                                  <span className="text-xs text-slate-500">{Math.round(rate)}%</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 h-6 w-6"
                                onClick={() => deleteHabitMutation.mutate(habit.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <HabitForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingHabit(null);
        }}
        habit={editingHabit}
      />

      <HabitAnalytics
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        habits={habits}
        completions={completions}
      />
    </>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Target, Plus, TrendingUp, Flame, BarChart3, Pencil, Trash2, SkipForward, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import HabitForm from './HabitForm';
import HabitAnalytics from './HabitAnalytics';
import HabitHeatmap from './HabitHeatmap';
import SkipReasonModal from './SkipReasonModal';

const CATEGORY_COLORS = {
  health: 'bg-green-100 text-green-700 border-green-200',
  fitness: 'bg-orange-100 text-orange-700 border-orange-200',
  productivity: 'bg-blue-100 text-blue-700 border-blue-200',
  learning: 'bg-purple-100 text-purple-700 border-purple-200',
  spiritual: 'bg-teal-100 text-teal-700 border-teal-200',
  social: 'bg-pink-100 text-pink-700 border-pink-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200'
};

const QUICK_HABITS = [
  { name: 'Drink 8 glasses of water', category: 'health', frequency: 'daily' },
  { name: 'Read for 30 mins', category: 'learning', frequency: 'daily' },
  { name: 'Daily Dhikr', category: 'spiritual', frequency: 'daily' },
  { name: 'Workout', category: 'fitness', frequency: 'daily' },
  { name: 'Morning Journaling', category: 'productivity', frequency: 'daily' },
  { name: 'No social media after 9pm', category: 'productivity', frequency: 'daily' }
];

export default function FullHabitTracker() {
  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [skipHabit, setSkipHabit] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [expandedHabit, setExpandedHabit] = useState(null);
  const queryClient = useQueryClient();

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: () => base44.entities.Habit.list('-created_date')
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['habitCompletions'],
    queryFn: () => base44.entities.HabitCompletion.list('-completion_date', 500)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ habit, isCompleting }) => {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const existing = completions.find(c => c.habit_id === habit.id && c.completion_date === dateStr);
      if (isCompleting && !existing) {
        return base44.entities.HabitCompletion.create({ habit_id: habit.id, completion_date: dateStr, count: 1 });
      } else if (!isCompleting && existing) {
        return base44.entities.HabitCompletion.delete(existing.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habitCompletions'] })
  });

  const skipMutation = useMutation({
    mutationFn: ({ habit, reason }) => {
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      return base44.entities.HabitCompletion.create({
        habit_id: habit.id,
        completion_date: dateStr,
        count: 0,
        notes: `Skipped: ${reason || 'No reason'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitCompletions'] });
      toast.success('Day marked as skipped');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Habit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit deleted');
    }
  });

  const quickAddMutation = useMutation({
    mutationFn: (habit) => base44.entities.Habit.create({ ...habit, is_active: true, target_count: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit added!');
    }
  });

  const isCompleted = (habit) => {
    const ds = format(new Date(), 'yyyy-MM-dd');
    const entry = completions.find(c => c.habit_id === habit.id && c.completion_date === ds);
    return entry?.count > 0;
  };

  const isSkipped = (habit) => {
    const ds = format(new Date(), 'yyyy-MM-dd');
    const entry = completions.find(c => c.habit_id === habit.id && c.completion_date === ds);
    return entry?.count === 0;
  };

  const getStreak = (habit) => {
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = format(d, 'yyyy-MM-dd');
      const done = completions.find(c => c.habit_id === habit.id && c.completion_date === ds && c.count > 0);
      if (!done) break;
      streak++;
      d = subDays(d, 1);
    }
    return streak;
  };

  const getRate = (habit) => {
    const last14 = Array.from({ length: 14 }, (_, i) => subDays(new Date(), i));
    const relevant = last14.filter(date => {
      const dow = date.getDay();
      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly') return habit.target_days?.includes(dow);
      return false;
    });
    const done = relevant.filter(d => completions.some(c => c.habit_id === habit.id && c.completion_date === format(d, 'yyyy-MM-dd') && c.count > 0));
    return relevant.length > 0 ? Math.round((done.length / relevant.length) * 100) : 0;
  };

  const getTodayHabits = () => activeHabits.filter(habit => {
    const dow = new Date().getDay();
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly') return habit.target_days?.includes(dow);
    if (habit.frequency === 'monthly') return new Date().getDate() === habit.target_day_of_month;
    return false;
  });

  const activeHabits = habits.filter(h => h.is_active);
  const todayHabits = getTodayHabits();
  const filteredHabits = filterCat === 'all' ? todayHabits : todayHabits.filter(h => h.category === filterCat);
  const completedToday = todayHabits.filter(h => isCompleted(h)).length;
  const overallProgress = todayHabits.length > 0 ? (completedToday / todayHabits.length) * 100 : 0;

  // Identify quick habits not yet added
  const existingNames = habits.map(h => h.name.toLowerCase());
  const suggestedHabits = QUICK_HABITS.filter(h => !existingNames.includes(h.name.toLowerCase()));

  return (
    <div className="space-y-5">
      {/* Summary Header */}
      <Card className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-teal-200 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-teal-800">Today's Habits</h2>
              <p className="text-sm text-teal-600">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)} className="gap-1">
                <BarChart3 className="w-4 h-4" /> Analytics
              </Button>
              <Button size="sm" onClick={() => { setEditingHabit(null); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700 gap-1">
                <Plus className="w-4 h-4" /> New
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-teal-700">{completedToday} of {todayHabits.length} completed</span>
                <span className="text-teal-600">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3 bg-teal-100" />
            </div>
          </div>
          {overallProgress === 100 && todayHabits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 p-3 bg-green-100 border border-green-300 rounded-xl text-center"
            >
              <p className="text-green-800 font-semibold text-sm">🎉 All habits completed today! Excellent work!</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {['all', 'health', 'fitness', 'spiritual', 'learning', 'productivity', 'social'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
              filterCat === cat
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50'
            )}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Habit List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filteredHabits.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No habits for today</p>
          <p className="text-sm text-slate-400 mt-1">Add a habit or change the filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredHabits.map(habit => {
              const done = isCompleted(habit);
              const skipped = isSkipped(habit);
              const streak = getStreak(habit);
              const rate = getRate(habit);
              const isExp = expandedHabit === habit.id;

              return (
                <motion.div key={habit.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={cn(
                    "overflow-hidden transition-all",
                    done ? "bg-gradient-to-r from-teal-50 to-green-50 border-teal-200" :
                    skipped ? "bg-amber-50 border-amber-200 opacity-75" :
                    "hover:shadow-md"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            checked={done}
                            disabled={skipped}
                            onCheckedChange={(checked) => toggleMutation.mutate({ habit, isCompleting: checked })}
                            className={cn("w-5 h-5", done && "border-teal-500")}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn("font-semibold text-sm", (done || skipped) && "line-through text-slate-400")}>
                                {habit.name}
                              </p>
                              {streak > 0 && (
                                <span className="flex items-center gap-0.5 text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                  <Flame className="w-3 h-3" /> {streak}
                                </span>
                              )}
                              {skipped && <Badge className="text-xs bg-amber-100 text-amber-700">Skipped</Badge>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!done && !skipped && (
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setSkipHabit(habit)}
                                  title="Skip today"
                                >
                                  <SkipForward className="w-3.5 h-3.5 text-amber-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingHabit(habit); setShowForm(true); }}>
                                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(habit.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                              </Button>
                            </div>
                          </div>
                          {habit.description && (
                            <p className="text-xs text-slate-500 mb-2">{habit.description}</p>
                          )}
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[habit.category])}>
                              {habit.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-500">{habit.frequency}</Badge>
                            <div className="flex items-center gap-1 flex-1">
                              <Progress value={rate} className="h-1.5 flex-1" />
                              <span className="text-xs text-slate-500 w-8 text-right">{rate}%</span>
                            </div>
                          </div>
                          {/* Heatmap toggle */}
                          <button
                            onClick={() => setExpandedHabit(isExp ? null : habit.id)}
                            className="mt-2 text-xs text-teal-600 hover:text-teal-800"
                          >
                            {isExp ? 'Hide history' : 'Show history'}
                          </button>
                          <AnimatePresence>
                            {isExp && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 overflow-hidden"
                              >
                                <p className="text-xs text-slate-400 mb-2">Last 9 weeks</p>
                                <HabitHeatmap habit={habit} completions={completions} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Quick Add Suggestions */}
      {suggestedHabits.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600 mb-2">💡 Quick Add Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {suggestedHabits.slice(0, 4).map((h, i) => (
              <button
                key={i}
                onClick={() => quickAddMutation.mutate(h)}
                className="px-3 py-1.5 text-xs border border-dashed border-teal-300 text-teal-700 bg-teal-50 rounded-full hover:bg-teal-100 transition-all"
              >
                + {h.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Motivational Insight */}
      {completedToday > 0 && todayHabits.length > 0 && overallProgress < 100 && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4">
            <p className="text-sm text-indigo-800">
              {overallProgress >= 75
                ? `🌟 You're almost there! Just ${todayHabits.length - completedToday} habit${todayHabits.length - completedToday > 1 ? 's' : ''} left.`
                : overallProgress >= 50
                ? `👍 Great momentum! You've completed ${completedToday} habits today. Keep going!`
                : `✨ Good start! You've completed ${completedToday} out of ${todayHabits.length} habits. Keep it up!`
              }
            </p>
          </CardContent>
        </Card>
      )}

      <HabitForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingHabit(null); }}
        habit={editingHabit}
      />
      <HabitAnalytics
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        habits={habits}
        completions={completions}
      />
      <SkipReasonModal
        isOpen={!!skipHabit}
        onClose={() => setSkipHabit(null)}
        habitName={skipHabit?.name || ''}
        onSkip={(reason) => {
          if (skipHabit) skipMutation.mutate({ habit: skipHabit, reason });
          setSkipHabit(null);
        }}
      />
    </div>
  );
}
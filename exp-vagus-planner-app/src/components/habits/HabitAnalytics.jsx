import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Calendar, Award } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';

export default function HabitAnalytics({ isOpen, onClose, habits, completions }) {
  const getHabitStats = (habit) => {
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), i));
    
    const relevantDays = last30Days.filter(date => {
      const dayOfWeek = date.getDay();
      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly') {
        return habit.target_days?.includes(dayOfWeek);
      }
      if (habit.frequency === 'monthly') {
        return date.getDate() === habit.target_day_of_month;
      }
      return false;
    });

    const completedDays = relevantDays.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return completions.some(c => c.habit_id === habit.id && c.completion_date === dateStr);
    });

    const streak = calculateStreak(habit, completions);
    const rate = relevantDays.length > 0 ? (completedDays.length / relevantDays.length) * 100 : 0;

    return {
      total: relevantDays.length,
      completed: completedDays.length,
      rate: Math.round(rate),
      streak
    };
  };

  const calculateStreak = (habit, completions) => {
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const isCompleted = completions.some(c => 
        c.habit_id === habit.id && c.completion_date === dateStr
      );
      
      if (!isCompleted) break;
      
      streak++;
      currentDate = subDays(currentDate, 1);
      
      if (streak > 365) break; // Safety limit
    }
    
    return streak;
  };

  const activeHabits = habits.filter(h => h.is_active);
  const totalCompletions = completions.length;
  const avgCompletionRate = activeHabits.length > 0
    ? Math.round(activeHabits.reduce((sum, h) => sum + getHabitStats(h).rate, 0) / activeHabits.length)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-600" />
            Habit Analytics
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Target className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{activeHabits.length}</p>
                  <p className="text-xs text-slate-500">Active Habits</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{totalCompletions}</p>
                  <p className="text-xs text-slate-500">Total Completions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{avgCompletionRate}%</p>
                  <p className="text-xs text-slate-500">Avg Completion</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Habit Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Habit Performance (Last 30 Days)</h3>
            {activeHabits.map(habit => {
              const stats = getHabitStats(habit);
              return (
                <Card key={habit.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm">{habit.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {habit.frequency}
                          </Badge>
                          {stats.streak > 0 && (
                            <Badge className="text-xs bg-orange-100 text-orange-700">
                              🔥 {stats.streak} day streak
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-teal-600">{stats.rate}%</p>
                        <p className="text-xs text-slate-500">{stats.completed}/{stats.total}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={stats.rate} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {activeHabits.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active habits to analyze</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
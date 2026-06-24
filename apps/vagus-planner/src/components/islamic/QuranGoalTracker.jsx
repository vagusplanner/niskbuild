import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, Plus, Flame, TrendingUp, BookOpen, 
  Calendar, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

export default function QuranGoalTracker({ compact = false }) {
  const [showForm, setShowForm] = useState(false);
  const [goalType, setGoalType] = useState('daily_verses');
  const [targetVerses, setTargetVerses] = useState(5);
  const [reminderTime, setReminderTime] = useState('20:00');

  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['quran-goals'],
    queryFn: () => base44.entities.QuranGoal.filter({ status: 'active' }),
    initialData: []
  });

  const activeGoal = goals[0];

  const { data: readings = [] } = useQuery({
    queryKey: ['quran-readings-month'],
    queryFn: () => base44.entities.QuranReading.list('-date', 100),
    initialData: []
  });

  const createGoalMutation = useMutation({
    mutationFn: (data) => base44.entities.QuranGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goals'] });
      toast.success('Quran reading goal created! 📖');
      setShowForm(false);
    }
  });

  const handleCreateGoal = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 365);

    createGoalMutation.mutate({
      title: goalType === 'daily_verses' 
        ? `Read ${targetVerses} verses daily`
        : goalType === 'complete_quran'
        ? 'Complete the Quran'
        : 'Custom Quran Goal',
      goal_type: goalType,
      target_verses_per_day: targetVerses,
      target_completion_date: endDate.toISOString().split('T')[0],
      current_surah: 1,
      current_verse: 1,
      total_verses_read: 0,
      streak: 0,
      best_streak: 0,
      reminder_enabled: true,
      reminder_time: reminderTime,
      quranly_sync: false,
      status: 'active'
    });
  };

  const todayReadings = readings.filter(r => r.date === format(new Date(), 'yyyy-MM-dd'));
  const todayVerses = todayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);
  const last7Days = readings.filter(r => {
    const days = differenceInDays(new Date(), new Date(r.date));
    return days >= 0 && days < 7;
  });

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">Quran Goal</h3>
            </div>
            {activeGoal && activeGoal.streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-lg">
                <Flame className="w-3 h-3 text-orange-600" />
                <span className="text-xs font-bold text-orange-600">{activeGoal.streak}</span>
              </div>
            )}
          </div>
          
          {activeGoal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">Today's Progress</span>
                <span className="font-semibold text-emerald-700">
                  {todayVerses} / {activeGoal.target_verses_per_day} verses
                </span>
              </div>
              <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.min((todayVerses / (activeGoal.target_verses_per_day || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-3 h-3 mr-1" />
              Set Goal
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-600" />
          Quran Reading Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!activeGoal ? (
          !showForm ? (
            <div className="text-center space-y-3 py-4">
              <BookOpen className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-semibold text-emerald-900">Start Your Quran Journey</h3>
              <p className="text-sm text-slate-600">
                Set a daily reading goal and track your progress
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Goal Type</Label>
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_verses">Daily Verses</SelectItem>
                    <SelectItem value="complete_quran">Complete Quran</SelectItem>
                    <SelectItem value="custom">Custom Goal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verses Per Day</Label>
                <Input
                  type="number"
                  min="1"
                  value={targetVerses}
                  onChange={(e) => setTargetVerses(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Daily Reminder Time</Label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {createGoalMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Create Goal
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{todayVerses}</p>
                <p className="text-xs text-slate-600">Today</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <p className="text-2xl font-bold text-orange-600">{activeGoal.streak}</p>
                </div>
                <p className="text-xs text-slate-600">Streak</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{activeGoal.total_verses_read}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
            </div>

            {/* Daily Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Today's Goal</span>
                <span className="text-sm font-semibold text-emerald-700">
                  {todayVerses} / {activeGoal.target_verses_per_day}
                </span>
              </div>
              <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${Math.min((todayVerses / (activeGoal.target_verses_per_day || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Last 7 Days */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Last 7 Days</h4>
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const dayReadings = readings.filter(r => r.date === dateStr);
                  const verses = dayReadings.reduce((sum, r) => sum + (r.verses_count || 0), 0);
                  const completed = verses >= (activeGoal.target_verses_per_day || 1);
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 h-16 rounded-lg flex flex-col items-center justify-center text-xs ${
                        completed ? 'bg-emerald-200' : verses > 0 ? 'bg-emerald-100' : 'bg-white/40'
                      }`}
                    >
                      <span className="text-slate-600">{format(date, 'EEE')[0]}</span>
                      {verses > 0 && (
                        <span className="font-bold text-emerald-700">{verses}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Position */}
            {activeGoal.current_surah && (
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-xs text-slate-600 mb-1">Continue Reading</p>
                <p className="font-semibold text-emerald-900">
                  Surah {activeGoal.current_surah}, Verse {activeGoal.current_verse}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
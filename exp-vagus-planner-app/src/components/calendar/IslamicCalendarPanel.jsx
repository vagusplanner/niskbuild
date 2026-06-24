import React, { useState, useEffect } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Moon, Sun, Flame, CheckCircle, Play, ChevronRight, Star, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toHijri } from '@/components/utils/hijriUtils';
import { format, addDays, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FASTING_TYPES = {
  ramadan:       { label: 'Ramadan', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  mondayThursday:{ label: 'Mon/Thu', color: 'bg-blue-500',    text: 'text-blue-700',    bg: 'bg-blue-50' },
  whiteDays:     { label: 'White Days', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
};

function getFastingTypes(date, hijriDate) {
  const dow = getDay(date);
  const types = [];
  if (hijriDate?.month === 9) types.push('ramadan');
  if (dow === 1 || dow === 4) types.push('mondayThursday');
  if (hijriDate?.day >= 13 && hijriDate?.day <= 15) types.push('whiteDays');
  return types;
}

export default function IslamicCalendarPanel({ selectedDate }) {
  const [hijriToday, setHijriToday] = useState(null);
  const [hijriSelected, setHijriSelected] = useState(null);
  const [showChallengeSetup, setShowChallengeSetup] = useState(false);
  const [goalType, setGoalType] = useState('mondayThursday');
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date();

  useEffect(() => {
    toHijri(today).then(setHijriToday);
  }, []);

  useEffect(() => {
    if (selectedDate) toHijri(selectedDate).then(setHijriSelected);
  }, [selectedDate]);

  const { data: goals = [] } = useQuery({
    queryKey: ['fasting-goals'],
    queryFn: () => SDK.entities.FastingGoal.filter({ status: 'active' }),
    initialData: []
  });

  const { data: records = [] } = useQuery({
    queryKey: ['fasting-records'],
    queryFn: () => SDK.entities.FastingRecord.list('-date', 30),
    initialData: []
  });

  const activeGoal = goals[0];
  const todayRecord = records.find(r => r.date === format(today, 'yyyy-MM-dd'));
  const completedToday = todayRecord?.completed;

  const createGoalMutation = useMutation({
    mutationFn: (data) => SDK.entities.FastingGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fasting-goals'] });
      toast.success('Fasting challenge started! 🎯');
      setShowChallengeSetup(false);
      setCreating(false);
    }
  });

  const completeFastMutation = useMutation({
    mutationFn: async ({ recordId, goalId }) => {
      await SDK.entities.FastingRecord.update(recordId, { completed: true });
      if (goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          const newCount = (goal.current_count || 0) + 1;
          const newStreak = (goal.streak || 0) + 1;
          await SDK.entities.FastingGoal.update(goalId, {
            current_count: newCount, streak: newStreak,
            best_streak: Math.max(newStreak, goal.best_streak || 0),
            status: newCount >= goal.target_count ? 'completed' : 'active'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fasting-records'] });
      queryClient.invalidateQueries({ queryKey: ['fasting-goals'] });
      toast.success('Fast completed! 🌙');
    }
  });

  const handleStart = () => {
    setCreating(true);
    const targetCount = goalType === 'mondayThursday' ? 52 : 36;
    const end = new Date(); end.setDate(end.getDate() + 365);
    createGoalMutation.mutate({
      title: goalType === 'mondayThursday' ? 'Monday & Thursday Challenge' : 'White Days Challenge',
      type: goalType, target_count: targetCount, current_count: 0,
      start_date: format(today, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd'),
      status: 'active', streak: 0, best_streak: 0, auto_schedule: true, reminder_enabled: true
    });
  };

  // Upcoming fasting days (next 7 days)
  const upcomingFasts = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1))
    .map(date => ({ date, types: getFastingTypes(date, toHijri(date)) }))
    .filter(d => d.types.length > 0)
    .slice(0, 3);

  // Today's fasting types
  const todayFastingTypes = hijriToday ? getFastingTypes(today, hijriToday) : [];
  // Selected date's fasting types
  const selectedFastingTypes = hijriSelected ? getFastingTypes(selectedDate, hijriSelected) : [];

  if (!hijriToday) return null;

  return (
    <div className="space-y-3">
      {/* ── Hijri Date Card ── */}
      <div className="rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="w-4 h-4" />
          <span className="text-xs font-medium opacity-80">Islamic Date</span>
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-3xl font-black">{hijriToday.day}</span>
          <span className="text-base font-bold opacity-95">{hijriToday.monthName}</span>
          <span className="text-sm opacity-80">{hijriToday.year} AH</span>
        </div>
        <div className="mt-1.5 text-sm font-semibold text-white/90">{format(today, 'EEEE, d MMMM yyyy')}</div>

        {/* Special month highlight */}
        {hijriToday.monthName === 'Ramadan' && (
          <div className="mt-2 flex items-center gap-1.5 bg-white/15 rounded-lg px-2 py-1">
            <Star className="w-3 h-3" fill="currentColor" />
            <span className="text-xs font-medium">Blessed Month of Ramadan</span>
          </div>
        )}

        {/* Today's fasting types */}
        {todayFastingTypes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {todayFastingTypes.map(t => (
              <span key={t} className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-medium">
                {FASTING_TYPES[t].label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Selected Date Info (if different from today) ── */}
      {selectedDate && !isSameDay(selectedDate, today) && hijriSelected && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Selected: {format(selectedDate, 'EEE, d MMM')}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{hijriSelected.day}</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">{hijriSelected.monthName} {hijriSelected.year} AH</span>
          </div>
          {selectedFastingTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {selectedFastingTypes.map(t => (
                <span key={t} className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium", FASTING_TYPES[t].bg, FASTING_TYPES[t].text)}>
                  {FASTING_TYPES[t].label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Fasting Challenge ── */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">Fasting Challenge</span>
          </div>
          {activeGoal?.streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">
              <Flame className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-bold text-orange-600">{activeGoal.streak}</span>
            </div>
          )}
        </div>

        {activeGoal ? (
          <div className="space-y-3">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400 truncate">{activeGoal.title}</span>
                <span className="font-semibold text-amber-700 ml-2 flex-shrink-0">{activeGoal.current_count || 0}/{activeGoal.target_count}</span>
              </div>
              <div className="h-2 bg-white/70 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${Math.min(((activeGoal.current_count || 0) / activeGoal.target_count) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Done', value: activeGoal.current_count || 0, color: 'text-emerald-700' },
                { label: 'Streak', value: activeGoal.streak || 0, color: 'text-orange-600' },
                { label: 'Best', value: activeGoal.best_streak || 0, color: 'text-blue-600' },
              ].map(s => (
                <div key={s.label} className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-2 text-center">
                  <div className={cn("text-lg font-bold", s.color)}>{s.value}</div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Complete today */}
            {todayRecord && !completedToday ? (
              <Button
                size="sm"
                onClick={() => completeFastMutation.mutate({ recordId: todayRecord.id, goalId: activeGoal.id })}
                disabled={completeFastMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
              >
                {completeFastMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                Complete Today's Fast
              </Button>
            ) : completedToday ? (
              <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-medium">Today's fast completed! 🎉</span>
              </div>
            ) : null}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!showChallengeSetup ? (
              <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Track voluntary fasting with reminders & streaks.</p>
                <Button size="sm" onClick={() => setShowChallengeSetup(true)} className="w-full bg-amber-600 hover:bg-amber-700 h-8 text-xs">
                  <Play className="w-3 h-3 mr-1" /> Start Challenge
                </Button>
              </motion.div>
            ) : (
              <motion.div key="setup" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mondayThursday">Mon & Thu (52/year)</SelectItem>
                    <SelectItem value="whiteDays">White Days 13-15 (36/year)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleStart} disabled={creating} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                    {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Target className="w-3 h-3 mr-1" />}
                    Start
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowChallengeSetup(false)} className="h-8 text-xs">Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ── Upcoming Fasting Days ── */}
      {upcomingFasts.length > 0 && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upcoming Fasts</span>
          </div>
          <div className="space-y-1.5">
            {upcomingFasts.map((fast, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">{format(fast.date, 'EEE, MMM d')}</span>
                <div className="flex gap-1">
                  {fast.types.map(t => (
                    <span key={t} className={cn("text-[9px] rounded-full px-1.5 py-0.5 font-medium", FASTING_TYPES[t].bg, FASTING_TYPES[t].text)}>
                      {FASTING_TYPES[t].label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.toDateString() === b.toDateString();
}
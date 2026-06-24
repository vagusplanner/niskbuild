import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Trash2, Loader2, Flame, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const GOAL_TYPES = [
  { value: 'quran_completion', label: 'Complete Quran', emoji: '📖', unit: 'juz', defaultTarget: 30 },
  { value: 'quran_juz', label: 'Daily Quran Juz', emoji: '📜', unit: 'juz/day', defaultTarget: 1 },
  { value: 'hadith_daily', label: 'Daily Hadith Study', emoji: '📚', unit: 'hadiths/day', defaultTarget: 1 },
  { value: 'dua_mastery', label: 'Dua Memorization', emoji: '🤲', unit: 'duas', defaultTarget: 5 },
  { value: 'qiyam_nights', label: 'Qiyam-ul-Layl Nights', emoji: '🌙', unit: 'nights', defaultTarget: 10 },
  { value: 'itikaaf', label: 'Itikaaf (Last 10 nights)', emoji: '🕌', unit: 'days', defaultTarget: 10 },
];

function GoalProgress({ goal, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState(1);
  const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  const typeInfo = GOAL_TYPES.find(t => t.value === goal.goal_type) || {};
  const completed = pct >= 100;

  const increment = async () => {
    setAdding(true);
    await onUpdate(goal, Math.min(goal.current_value + amount, goal.target_value));
    setAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-2 ${completed ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeInfo.emoji || '🎯'}</span>
          <div>
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{goal.title}</p>
            <p className="text-xs text-slate-500">{goal.current_value} / {goal.target_value} {typeInfo.unit}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {goal.streak_days > 0 && (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
              <Flame className="w-2.5 h-2.5 mr-1" />{goal.streak_days}
            </Badge>
          )}
          {completed && <Badge className="bg-emerald-100 text-emerald-700 text-xs"><Check className="w-3 h-3 mr-1" />Done!</Badge>}
          <button onClick={() => onDelete(goal.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          className={`h-full rounded-full ${completed ? 'bg-emerald-500' : 'bg-violet-500'}`}
        />
      </div>

      {!completed && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value) || 1)}
            className="w-16 px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-center outline-none focus:ring-1 focus:ring-violet-400"
          />
          <Button size="sm" onClick={increment} disabled={adding} className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white">
            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : `+ Log ${typeInfo.unit || 'progress'}`}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default function RamadanGoalsTracker() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ goal_type: 'quran_completion', title: '', target_value: 30 });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['ramadanGoals'],
    queryFn: () => base44.entities.RamadanGoal.filter({ status: 'active' }),
  });

  const handleTypeChange = (type) => {
    const info = GOAL_TYPES.find(t => t.value === type);
    setForm(f => ({ ...f, goal_type: type, title: info?.label || '', target_value: info?.defaultTarget || 1 }));
  };

  const createGoal = async () => {
    if (!form.title) return toast.error('Please enter a goal title');
    setSaving(true);
    await base44.entities.RamadanGoal.create({
      ...form,
      current_value: 0,
      status: 'active',
      ramadan_year: 1447,
      streak_days: 0,
      best_streak: 0,
    });
    await queryClient.invalidateQueries({ queryKey: ['ramadanGoals'] });
    setSaving(false);
    setShowForm(false);
    setForm({ goal_type: 'quran_completion', title: '', target_value: 30 });
    toast.success('Goal created! May Allah grant you tawfiq 🤲');
  };

  const updateGoal = async (goal, newValue) => {
    const now = new Date().toISOString().split('T')[0];
    const streak = goal.last_activity_date === new Date(Date.now() - 86400000).toISOString().split('T')[0]
      ? (goal.streak_days || 0) + 1
      : goal.last_activity_date === now ? goal.streak_days : 1;
    await base44.entities.RamadanGoal.update(goal.id, {
      current_value: newValue,
      last_activity_date: now,
      streak_days: streak,
      best_streak: Math.max(streak, goal.best_streak || 0),
      status: newValue >= goal.target_value ? 'completed' : 'active',
    });
    await queryClient.invalidateQueries({ queryKey: ['ramadanGoals'] });
    if (newValue >= goal.target_value) toast.success('🎉 Goal completed! Alhamdulillah!');
  };

  const deleteGoal = async (id) => {
    await base44.entities.RamadanGoal.delete(id);
    await queryClient.invalidateQueries({ queryKey: ['ramadanGoals'] });
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-violet-600" />
            Ramadan Goals
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800 space-y-3 mb-2">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">New Ramadan Goal</p>
                <select
                  value={form.goal_type}
                  onChange={e => handleTypeChange(e.target.value)}
                  className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
                >
                  {GOAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Goal name (customize it)"
                  className="w-full text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">Target:</label>
                  <input
                    type="number"
                    min="1"
                    value={form.target_value}
                    onChange={e => setForm(f => ({ ...f, target_value: parseFloat(e.target.value) || 1 }))}
                    className="flex-1 text-sm p-2 rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="text-xs text-slate-500">{GOAL_TYPES.find(t => t.value === form.goal_type)?.unit}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                  <Button size="sm" onClick={createGoal} disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Goal'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>}

        {!isLoading && goals.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active goals yet. Add your first Ramadan goal!</p>
          </div>
        )}

        {goals.map(goal => (
          <GoalProgress key={goal.id} goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
        ))}
      </CardContent>
    </Card>
  );
}
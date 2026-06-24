import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfDay, differenceInCalendarDays } from 'date-fns';
import {
  Flame, CheckCircle2, Circle, TrendingUp, Bell, BellOff,
  Plus, X, ChevronDown, ChevronUp, Star, BarChart3, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Preset spiritual habits ────────────────────────────────────────────────
const PRESETS = [
  { id: 'quran',       label: 'Quran Reading',   emoji: '📖', target: 1,  unit: 'pages',    color: '#10b981' },
  { id: 'fajr',        label: 'Fajr Prayer',      emoji: '🌅', target: 1,  unit: 'prayers',  color: '#f59e0b' },
  { id: 'sunnah',      label: 'Sunnah Prayers',   emoji: '🕌', target: 12, unit: 'rakah',    color: '#6366f1' },
  { id: 'dhikr',       label: 'Morning Dhikr',    emoji: '📿', target: 33, unit: 'counts',   color: '#0ea5e9' },
  { id: 'dhikr_eve',   label: 'Evening Dhikr',    emoji: '🌙', target: 33, unit: 'counts',   color: '#8b5cf6' },
  { id: 'istighfar',   label: 'Istighfar',        emoji: '🤲', target: 100,unit: 'times',    color: '#ec4899' },
  { id: 'dua',         label: 'Dua & Supplication',emoji: '🙏',target: 1,  unit: 'sessions', color: '#14b8a6' },
  { id: 'sadaqah',     label: 'Daily Sadaqah',    emoji: '❤️', target: 1,  unit: 'acts',     color: '#f97316' },
];

// ── Build last-14-day completion data ─────────────────────────────────────
function buildChartData(completions = [], days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
    const done = completions.includes(date);
    return { date, label: format(subDays(new Date(), days - 1 - i), 'EEE'), done };
  });
}

// ── Compute current streak ─────────────────────────────────────────────────
function computeStreak(completions = []) {
  if (!completions.length) return 0;
  const sorted = [...completions].sort().reverse();
  let streak = 0;
  let check = startOfDay(new Date());
  for (const d of sorted) {
    const day = startOfDay(new Date(d));
    const diff = differenceInCalendarDays(check, day);
    if (diff === 0 || diff === 1) { streak++; check = day; }
    else break;
  }
  return streak;
}

// ── Habit card ─────────────────────────────────────────────────────────────
function HabitCard({ habit, completions, onToggle, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const doneToday = completions.includes(today);
  const streak = computeStreak(completions);
  const chartData = buildChartData(completions);
  const totalDone = completions.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => onToggle(today)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all text-xl',
            doneToday
              ? 'bg-emerald-100 dark:bg-emerald-900/40 scale-105'
              : 'bg-slate-100 dark:bg-slate-700 opacity-60 hover:opacity-90'
          )}
        >
          {habit.emoji}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{habit.label}</p>
            {doneToday && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-[10px] font-bold text-orange-500">
              <Flame className="w-3 h-3" /> {streak}d streak
            </span>
            <span className="text-[10px] text-slate-400">{totalDone} total days</span>
          </div>
        </div>

        {/* 14-day mini dots */}
        <div className="flex gap-0.5 flex-shrink-0">
          {chartData.slice(-7).map((d, i) => (
            <div key={i} className={cn('w-2.5 h-2.5 rounded-sm', d.done ? 'bg-emerald-400' : 'bg-slate-100 dark:bg-slate-700')} />
          ))}
        </div>

        <button onClick={() => setExpanded(v => !v)} className="ml-1 text-slate-400 hover:text-slate-600 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded chart */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-50 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Last 14 Days</p>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={chartData} barSize={10}>
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={1} />
                  <Tooltip
                    formatter={() => []}
                    labelFormatter={(l) => l}
                    contentStyle={{ fontSize: 10, padding: '4px 8px', borderRadius: 8 }}
                  />
                  <Bar dataKey="done" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.done ? habit.color : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Completion % this week */}
              {(() => {
                const last7 = chartData.slice(-7);
                const pct = Math.round((last7.filter(d => d.done).length / 7) * 100);
                return (
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    This week: <span className="font-bold" style={{ color: habit.color }}>{pct}% complete</span>
                  </p>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SpiritualHabitTracker() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('spirit_notif') === 'true');
  const [notifTime, setNotifTime] = useState(() => localStorage.getItem('spirit_notif_time') || '07:00');

  // Store habits as Habit entity rows, completions stored in completion_dates array
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['spiritualHabits'],
    queryFn: () => base44.entities.Habit.filter({ category: 'spiritual' }, 'created_date', 50),
  });

  const toggleNotifications = async () => {
    const next = !notifEnabled;
    if (next) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast.error('Please allow notifications in your browser settings.'); return; }
      toast.success('🔔 Daily reminders enabled!');
    } else {
      toast.success('Notifications disabled.');
    }
    setNotifEnabled(next);
    localStorage.setItem('spirit_notif', String(next));
  };

  const saveNotifTime = (t) => {
    setNotifTime(t);
    localStorage.setItem('spirit_notif_time', t);
  };

  const addHabit = async (preset) => {
    await base44.entities.Habit.create({
      title: preset.label,
      category: 'spiritual',
      frequency: 'daily',
      target_count: preset.target,
      notes: JSON.stringify({ emoji: preset.emoji, color: preset.color, unit: preset.unit, presetId: preset.id }),
      completion_dates: [],
    });
    queryClient.invalidateQueries({ queryKey: ['spiritualHabits'] });
    setShowAdd(false);
    toast.success(`${preset.emoji} ${preset.label} added!`);
  };

  const toggleDay = async (habit, date) => {
    const current = habit.completion_dates || [];
    const next = current.includes(date) ? current.filter(d => d !== date) : [...current, date];
    await base44.entities.Habit.update(habit.id, { completion_dates: next });
    queryClient.invalidateQueries({ queryKey: ['spiritualHabits'] });
  };

  const removeHabit = async (habit) => {
    await base44.entities.Habit.delete(habit.id);
    queryClient.invalidateQueries({ queryKey: ['spiritualHabits'] });
    toast.success('Habit removed.');
  };

  // Overall stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const doneToday = habits.filter(h => (h.completion_dates || []).includes(today)).length;
  const totalStreaks = habits.reduce((sum, h) => sum + computeStreak(h.completion_dates || []), 0);

  // Parse meta stored in notes
  const getMeta = (h) => {
    try { return JSON.parse(h.notes || '{}'); } catch { return {}; }
  };

  // Already-added preset IDs
  const addedIds = habits.map(h => getMeta(h).presetId).filter(Boolean);
  const availablePresets = PRESETS.filter(p => !addedIds.includes(p.id));

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-3 text-center shadow-sm">
          <p className="text-2xl font-black text-emerald-500">{doneToday}/{habits.length}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Done Today</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-3 text-center shadow-sm">
          <p className="text-2xl font-black text-orange-500 flex items-center justify-center gap-1">
            <Flame className="w-5 h-5" />{totalStreaks}
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Total Streak Days</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-3 text-center shadow-sm">
          <p className="text-2xl font-black text-amber-500">
            {habits.length > 0 ? Math.round((doneToday / habits.length) * 100) : 0}%
          </p>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Today's Rate</p>
        </div>
      </div>

      {/* ── Notification settings ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2.5">
          {notifEnabled ? <Bell className="w-4 h-4 text-teal-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Daily Reminder</p>
            <p className="text-[10px] text-slate-400">Push notification to stay consistent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notifEnabled && (
            <input
              type="time"
              value={notifTime}
              onChange={e => saveNotifTime(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            />
          )}
          <button
            onClick={toggleNotifications}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              notifEnabled ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'
            )}
          >
            <span className={cn('pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
              notifEnabled ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      </div>

      {/* ── Habits list ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <span className="text-5xl">📿</span>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No spiritual habits yet</p>
          <p className="text-xs text-slate-400">Add your first habit to start tracking your daily practice</p>
          <Button onClick={() => setShowAdd(true)} className="mt-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" /> Add First Habit
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(h => {
            const meta = getMeta(h);
            return (
              <HabitCard
                key={h.id}
                habit={{ ...h, emoji: meta.emoji || '📿', color: meta.color || '#10b981', label: h.title }}
                completions={h.completion_dates || []}
                onToggle={(date) => toggleDay(h, date)}
                onRemove={() => removeHabit(h)}
              />
            );
          })}
          <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full border-dashed text-slate-400 hover:text-teal-600 hover:border-teal-400">
            <Plus className="w-4 h-4 mr-1" /> Add Habit
          </Button>
        </div>
      )}

      {/* ── Add habit sheet ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={() => setShowAdd(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-700 p-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" /> Add Spiritual Habit
                </h3>
                <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              {availablePresets.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">You've added all preset habits! 🎉</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {availablePresets.map(p => (
                    <button key={p.id} onClick={() => addHabit(p)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-left transition-all group shadow-sm">
                      <span className="text-2xl">{p.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-300">{p.label}</p>
                        <p className="text-[10px] text-slate-400">Target: {p.target} {p.unit} / day</p>
                      </div>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
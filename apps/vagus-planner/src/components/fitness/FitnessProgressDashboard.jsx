/**
 * FitnessProgressDashboard
 * Shows weight trend, meal adherence, macro progress and calendar-connected workout events.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, TrendingDown, TrendingUp, Minus, Calendar, Dumbbell,
  Flame, CheckCircle2, XCircle, Loader2, Plus, Sparkles, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';

// ── Weight Log Entry ──────────────────────────────────────────────────────────
function WeightLogger({ goal, onLogged }) {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!weight || isNaN(parseFloat(weight))) { toast.error('Enter a valid weight'); return; }
    setSaving(true);
    const entry = { date: new Date().toISOString().split('T')[0], weight_kg: parseFloat(weight), notes };
    const updatedLog = [...(goal.weight_log || []), entry];
    await base44.entities.FitnessGoal.update(goal.id, {
      current_weight_kg: parseFloat(weight),
      weight_log: updatedLog,
    });
    setWeight('');
    setNotes('');
    toast.success('Weight logged! ✅');
    onLogged();
    setSaving(false);
  };

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="text-xs text-slate-500 font-semibold mb-1 block">Today's Weight (kg)</label>
        <Input type="number" step="0.1" placeholder={`Current: ${goal.current_weight_kg || '?'} kg`}
          value={weight} onChange={e => setWeight(e.target.value)} className="h-10 text-sm" />
      </div>
      <div className="flex-1">
        <label className="text-xs text-slate-500 font-semibold mb-1 block">Note (optional)</label>
        <Input placeholder="e.g. after workout" value={notes}
          onChange={e => setNotes(e.target.value)} className="h-10 text-sm" />
      </div>
      <Button onClick={handleLog} disabled={saving} className="h-10 bg-[#1D6FB8] text-white px-3 flex-shrink-0 gap-1">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Log
      </Button>
    </div>
  );
}

// ── Adherence Logger ──────────────────────────────────────────────────────────
function AdherenceLogger({ goal, onLogged }) {
  const [mealsFollowed, setMealsFollowed] = useState(3);
  const [totalMeals] = useState(4);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const pct = Math.round((mealsFollowed / totalMeals) * 100);

  const handleLog = async () => {
    setSaving(true);
    const entry = {
      date: new Date().toISOString().split('T')[0],
      adherence_pct: pct,
      meals_followed: mealsFollowed,
      total_meals: totalMeals,
      notes,
    };
    const updatedLog = [
      ...(goal.meal_adherence_log || []).filter(e => e.date !== entry.date),
      entry,
    ];
    await base44.entities.FitnessGoal.update(goal.id, { meal_adherence_log: updatedLog });
    setNotes('');
    toast.success('Adherence logged! 🍽️');
    onLogged();
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="text-xs text-slate-500 font-semibold mb-1 block">Meals followed today</label>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(n => (
              <button key={n} type="button" onClick={() => setMealsFollowed(n)}
                className={cn('w-9 h-9 rounded-lg text-sm font-bold border-2 transition-all',
                  mealsFollowed === n ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-emerald-300')}>
                {n}
              </button>
            ))}
            <span className="text-slate-400 text-sm self-center">/ 4</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-sm',
            pct >= 75 ? 'bg-emerald-100 text-emerald-600' : pct >= 50 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-500')}>
            {pct}%
          </div>
        </div>
        <div className="flex-1 min-w-32">
          <label className="text-xs text-slate-500 font-semibold mb-1 block">Note</label>
          <Input placeholder="optional note…" value={notes}
            onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
        </div>
        <Button onClick={handleLog} disabled={saving} className="h-9 bg-emerald-500 hover:bg-emerald-600 text-white px-3 flex-shrink-0 gap-1 mt-4">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Log
        </Button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function FitnessProgressDashboard({ goal, onRefresh }) {
  const [macroLoading, setMacroLoading] = useState(false);
  const [macroResult, setMacroResult] = useState(null);
  const [showAdherenceLogger, setShowAdherenceLogger] = useState(false);

  // Calendar workout events (last 14 days)
  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.Event.list('-start_date', 50),
  });
  const workoutKeywords = ['gym', 'workout', 'run', 'cycle', 'swim', 'yoga', 'training', 'exercise', 'sport', 'football', 'tennis', 'boxing'];
  const cutoff = subDays(new Date(), 14).toISOString().split('T')[0];
  const calendarWorkouts = events.filter(e =>
    e.start_date?.split('T')[0] >= cutoff &&
    workoutKeywords.some(kw => (e.title || '').toLowerCase().includes(kw) || (e.category || '') === 'health')
  );

  // Exercise logs
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => base44.entities.Exercise.list('-date', 20),
  });

  const handleRefreshMacros = async () => {
    setMacroLoading(true);
    try {
      const res = await base44.functions.invoke('adjustMacrosForFitnessGoal', { fitness_goal_id: goal.id });
      setMacroResult(res.data);
      toast.success('Macros updated based on your activity! 💪');
      onRefresh();
    } catch {
      toast.error('Could not analyse activity. Please try again.');
    }
    setMacroLoading(false);
  };

  // ── Derived chart data ──────────────────────────────────────────────────────
  const weightLog = [...(goal.weight_log || [])].sort((a, b) => a.date > b.date ? 1 : -1);
  const weightChartData = weightLog.slice(-10).map(e => ({
    date: format(parseISO(e.date), 'MMM d'),
    weight: e.weight_kg,
  }));
  if (goal.target_weight_kg) {
    // Add target as reference
  }

  const adherenceLog = [...(goal.meal_adherence_log || [])].sort((a, b) => a.date > b.date ? 1 : -1);
  const adherenceChartData = adherenceLog.slice(-14).map(e => ({
    date: format(parseISO(e.date), 'MMM d'),
    adherence: e.adherence_pct,
  }));

  const avgAdherence = adherenceLog.length
    ? Math.round(adherenceLog.reduce((s, e) => s + e.adherence_pct, 0) / adherenceLog.length)
    : null;

  // Weight progress
  const firstWeight = weightLog[0]?.weight_kg;
  const latestWeight = weightLog[weightLog.length - 1]?.weight_kg || goal.current_weight_kg;
  const weightChange = firstWeight && latestWeight ? (latestWeight - firstWeight).toFixed(1) : null;
  const isLoss = weightChange < 0;
  const distToTarget = goal.target_weight_kg && latestWeight
    ? (latestWeight - goal.target_weight_kg).toFixed(1)
    : null;

  // Macro targets (prefer AI result, fall back to goal stored values)
  const macros = macroResult?.macros || {
    daily_calories: goal.recommended_calories,
    daily_protein_g: goal.recommended_protein_g,
    daily_carbs_g: goal.recommended_carbs_g,
    daily_fats_g: goal.recommended_fats_g,
  };
  const hasMacros = macros.daily_calories;

  const GOAL_LABELS = {
    weight_loss: '🔥 Weight Loss', muscle_gain: '💪 Muscle Gain',
    maintenance: '⚖️ Maintenance', endurance: '🏃 Endurance', general_health: '🌿 General Health'
  };

  return (
    <div className="space-y-5">

      {/* Goal summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Goal',
            value: GOAL_LABELS[goal.goal_type] || goal.goal_type,
            sub: goal.target_date ? `By ${format(parseISO(goal.target_date), 'MMM yyyy')}` : '',
            color: 'text-[#1D6FB8]',
          },
          {
            label: 'Current Weight',
            value: latestWeight ? `${latestWeight} kg` : '—',
            sub: distToTarget ? `${Math.abs(distToTarget)} kg to target` : '',
            color: 'text-slate-700 dark:text-slate-200',
          },
          {
            label: 'Progress',
            value: weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange} kg` : '—',
            sub: `Since ${weightLog[0]?.date ? format(parseISO(weightLog[0].date), 'MMM d') : 'start'}`,
            color: isLoss ? 'text-emerald-500' : weightChange > 0 ? 'text-amber-500' : 'text-slate-500',
          },
          {
            label: 'Meal Adherence',
            value: avgAdherence != null ? `${avgAdherence}%` : '—',
            sub: `avg over ${adherenceLog.length} days`,
            color: avgAdherence >= 75 ? 'text-emerald-500' : avgAdherence >= 50 ? 'text-amber-500' : 'text-red-500',
          },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-center">
            <p className={cn('text-base font-black', s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{s.label}</p>
            {s.sub && <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* AI Macro refresh */}
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#0D4F6C] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E8B84B]" /> AI Macro Recommendations
            </p>
            <p className="text-[11px] text-white/50 mt-0.5">Adjusted for your actual workout activity this week</p>
          </div>
          <Button onClick={handleRefreshMacros} disabled={macroLoading} size="sm"
            className="bg-[#E8B84B] hover:bg-amber-500 text-slate-900 font-bold gap-1.5 h-9">
            {macroLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {macroLoading ? 'Analysing…' : 'Refresh Macros'}
          </Button>
        </div>

        {hasMacros && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', value: Math.round(macros.daily_calories), unit: 'kcal', color: 'text-orange-400' },
              { label: 'Protein',  value: Math.round(macros.daily_protein_g), unit: 'g', color: 'text-blue-400' },
              { label: 'Carbs',    value: Math.round(macros.daily_carbs_g), unit: 'g', color: 'text-amber-400' },
              { label: 'Fats',     value: Math.round(macros.daily_fats_g), unit: 'g', color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="text-center bg-white/8 rounded-xl py-2.5">
                <p className={cn('text-base font-black', m.color)}>{m.value}<span className="text-[10px] font-normal text-white/40 ml-0.5">{m.unit}</span></p>
                <p className="text-[10px] text-white/40 uppercase font-semibold">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {macroResult && (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-2">
              {macroResult.macros?.activity_assessment && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <Info className="w-3.5 h-3.5 text-[#29ABE2] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70">{macroResult.macros.activity_assessment}</p>
                </div>
              )}
              {macroResult.macros?.next_week_recommendations?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Next Week</p>
                  {macroResult.macros.next_week_recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="text-[#E8B84B] font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
              {macroResult.macros?.estimated_progress && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">{macroResult.macros.estimated_progress}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Weight chart */}
      {weightChartData.length >= 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Weight Trend
            </p>
            {weightChange && (
              <Badge className={cn('text-xs', isLoss ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                {isLoss ? '↓' : '↑'} {Math.abs(weightChange)} kg
              </Badge>
            )}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={v => [`${v} kg`, 'Weight']}
              />
              {goal.target_weight_kg && (
                <ReferenceLine y={goal.target_weight_kg} stroke="#10b981" strokeDasharray="4 4"
                  label={{ value: `Target: ${goal.target_weight_kg}kg`, fill: '#10b981', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#1D6FB8" strokeWidth={2.5}
                dot={{ fill: '#1D6FB8', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Meal adherence chart */}
      {adherenceChartData.length >= 2 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Meal Plan Adherence
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={adherenceChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={v => [`${v}%`, 'Adherence']}
              />
              <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" />
              <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
                {adherenceChartData.map((d, i) => (
                  <Cell key={i} fill={d.adherence >= 75 ? '#10b981' : d.adherence >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 mt-1">Green dashed line = 75% target</p>
        </div>
      )}

      {/* Calendar workouts */}
      {calendarWorkouts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#1D6FB8]" /> Workout Events (last 14 days)
          </p>
          <div className="space-y-1.5">
            {calendarWorkouts.slice(0, 8).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <Dumbbell className="w-3.5 h-3.5 text-[#1D6FB8] flex-shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{ev.title}</span>
                <span className="text-[11px] text-slate-400">{ev.start_date?.split('T')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Log Today's Weight
          </p>
          <WeightLogger goal={goal} onLogged={onRefresh} />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Log Meal Adherence
          </p>
          <AdherenceLogger goal={goal} onLogged={onRefresh} />
        </div>
      </div>
    </div>
  );
}
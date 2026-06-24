/**
 * FitnessGoalSetup
 * Form to create/edit a FitnessGoal record.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Target, Scale, Ruler, Loader2, CheckCircle2, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

const GOAL_TYPES = [
  { value: 'weight_loss',     label: 'Weight Loss',    emoji: '🔥', desc: 'Calorie deficit, high protein' },
  { value: 'muscle_gain',     label: 'Muscle Gain',    emoji: '💪', desc: 'Calorie surplus, very high protein' },
  { value: 'maintenance',     label: 'Maintenance',    emoji: '⚖️', desc: 'Match TDEE, balanced macros' },
  { value: 'endurance',       label: 'Endurance',      emoji: '🏃', desc: 'High carbs for sustained energy' },
  { value: 'general_health',  label: 'General Health', emoji: '🌿', desc: 'Balanced & nutritious' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary',          label: 'Sedentary',          desc: 'Desk job, little exercise' },
  { value: 'lightly_active',     label: 'Lightly Active',     desc: '1–3 days/week exercise' },
  { value: 'moderately_active',  label: 'Moderately Active',  desc: '3–5 days/week exercise' },
  { value: 'very_active',        label: 'Very Active',        desc: '6–7 days/week hard exercise' },
  { value: 'extremely_active',   label: 'Extremely Active',   desc: 'Physical job + training' },
];

export default function FitnessGoalSetup({ existing, onSaved, onCancel }) {
  const [form, setForm] = useState({
    goal_type:             existing?.goal_type || 'general_health',
    current_weight_kg:     existing?.current_weight_kg || '',
    target_weight_kg:      existing?.target_weight_kg || '',
    height_cm:             existing?.height_cm || '',
    age:                   existing?.age || '',
    sex:                   existing?.sex || 'male',
    activity_level:        existing?.activity_level || 'moderately_active',
    weekly_workout_target: existing?.weekly_workout_target || 3,
    target_date:           existing?.target_date || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    notes:                 existing?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.current_weight_kg || !form.height_cm) {
      toast.error('Please enter your current weight and height');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        current_weight_kg: parseFloat(form.current_weight_kg),
        target_weight_kg:  form.target_weight_kg ? parseFloat(form.target_weight_kg) : undefined,
        height_cm:         parseFloat(form.height_cm),
        age:               form.age ? parseInt(form.age) : undefined,
        weekly_workout_target: parseInt(form.weekly_workout_target),
        status: 'active',
      };
      if (existing?.id) {
        await base44.entities.FitnessGoal.update(existing.id, data);
        toast.success('Goal updated!');
      } else {
        await base44.entities.FitnessGoal.create(data);
        toast.success('Fitness goal created! 🎯');
      }
      onSaved();
    } catch {
      toast.error('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Goal type picker */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">What's your primary goal?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GOAL_TYPES.map(gt => (
            <button key={gt.value} type="button" onClick={() => set('goal_type', gt.value)}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all',
                form.goal_type === gt.value
                  ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
              )}>
              <span className="text-2xl">{gt.emoji}</span>
              <div>
                <p className={cn('text-sm font-bold', form.goal_type === gt.value ? 'text-[#1D6FB8]' : 'text-slate-700 dark:text-slate-200')}>{gt.label}</p>
                <p className="text-[11px] text-slate-400">{gt.desc}</p>
              </div>
              {form.goal_type === gt.value && <CheckCircle2 className="w-4 h-4 text-[#1D6FB8] ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Body stats */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> Body Stats
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Current Weight (kg)</label>
            <Input type="number" step="0.1" placeholder="70" value={form.current_weight_kg}
              onChange={e => set('current_weight_kg', e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Target Weight (kg)</label>
            <Input type="number" step="0.1" placeholder="65" value={form.target_weight_kg}
              onChange={e => set('target_weight_kg', e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Height (cm)</label>
            <Input type="number" placeholder="170" value={form.height_cm}
              onChange={e => set('height_cm', e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Age</label>
            <Input type="number" placeholder="30" value={form.age}
              onChange={e => set('age', e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Sex</label>
            <div className="flex h-10 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {['male', 'female'].map(s => (
                <button key={s} type="button" onClick={() => set('sex', s)}
                  className={cn('flex-1 text-sm font-medium transition-all capitalize',
                    form.sex === s ? 'bg-[#1D6FB8] text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-semibold">Target Date</label>
            <Input type="date" value={form.target_date}
              onChange={e => set('target_date', e.target.value)} className="h-10 text-sm" />
          </div>
        </div>
      </div>

      {/* Activity level */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5" /> Activity Level
        </p>
        <div className="space-y-1.5">
          {ACTIVITY_LEVELS.map(al => (
            <button key={al.value} type="button" onClick={() => set('activity_level', al.value)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all',
                form.activity_level === al.value
                  ? 'border-[#1D6FB8] bg-blue-50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
              )}>
              <div>
                <p className={cn('text-sm font-semibold', form.activity_level === al.value ? 'text-[#1D6FB8]' : 'text-slate-700 dark:text-slate-200')}>{al.label}</p>
                <p className="text-[11px] text-slate-400">{al.desc}</p>
              </div>
              {form.activity_level === al.value && <CheckCircle2 className="w-4 h-4 text-[#1D6FB8] flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Workout target */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">
          Weekly Workout Target (sessions)
        </label>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <button key={n} type="button" onClick={() => set('weekly_workout_target', n)}
                className={cn('w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all',
                  form.weekly_workout_target === n
                    ? 'bg-[#1D6FB8] text-white border-[#1D6FB8]'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300')}>
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">days/week</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11">
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 h-11 bg-[#1D6FB8] hover:bg-[#2980B9] text-white font-bold gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          {existing ? 'Update Goal' : 'Save Fitness Goal'}
        </Button>
      </div>
    </div>
  );
}
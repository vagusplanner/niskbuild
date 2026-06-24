/**
 * FitnessGoalDashboard page
 * 3 tabs: Goal Setup | Progress Dashboard | Macros for Meal Plan
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Dumbbell, Loader2, Plus, Edit2, Flame, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import FitnessGoalSetup from '@/components/fitness/FitnessGoalSetup';
import FitnessProgressDashboard from '@/components/fitness/FitnessProgressDashboard';
import { Link } from 'react-router-dom';

const TABS = [
  { key: 'progress', label: 'Progress',    icon: TrendingUp },
  { key: 'setup',    label: 'Goal Setup',  icon: Target },
];

const GOAL_LABELS = {
  weight_loss: '🔥 Weight Loss', muscle_gain: '💪 Muscle Gain',
  maintenance: '⚖️ Maintenance', endurance: '🏃 Endurance', general_health: '🌿 General Health',
  flexibility: '🧘 Flexibility',
};

export default function FitnessGoalDashboard() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('progress');

  const { data: goals = [], isLoading, refetch } = useQuery({
    queryKey: ['fitnessGoals'],
    queryFn: () => base44.entities.FitnessGoal.list('-created_date', 10),
  });

  const activeGoal = goals.find(g => g.status === 'active') || goals[0] || null;
  const hasGoal = !!activeGoal;

  // If no goal, default to setup tab
  const currentTab = !hasGoal ? 'setup' : tab;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #1D6FB8 60%, #10b981 100%)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, #E8B84B, #10b981, #1D6FB8)' }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-4 h-4" style={{ color: '#E8B84B' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#A8C8E8' }}>AI-Powered</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Fitness Goal Tracker</h1>
            <p className="text-sm mt-0.5" style={{ color: '#A8C8E8' }}>
              Set goals · get AI macro targets · track adherence
            </p>
          </div>
          {activeGoal && (
            <div className="text-right">
              <Badge className="bg-white/10 text-white border-white/20 text-xs mb-1">
                {GOAL_LABELS[activeGoal.goal_type]}
              </Badge>
              {activeGoal.recommended_calories && (
                <p className="text-white font-black text-lg flex items-center gap-1 justify-end">
                  <Flame className="w-4 h-4 text-orange-400" />
                  {Math.round(activeGoal.recommended_calories)} kcal
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Link to Meal Planner */}
      {activeGoal?.recommended_calories && (
        <Link to="/MealPlanner"
          className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 hover:border-emerald-400 transition-colors group">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Open Meal Planner</p>
              <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">
                Your AI macros ({Math.round(activeGoal.recommended_calories)} kcal, {Math.round(activeGoal.recommended_protein_g || 0)}g protein) are ready to use
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Tabs */}
      {hasGoal && (
        <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-bold transition-all',
                  currentTab === t.key
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* No goal state */}
      {!isLoading && !hasGoal && currentTab !== 'setup' && (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Target className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-500 mb-1">No fitness goal set yet</h3>
          <p className="text-sm text-slate-400 mb-4">Set a goal to get personalised macro targets</p>
          <Button onClick={() => setTab('setup')} className="bg-[#1D6FB8] text-white gap-2">
            <Plus className="w-4 h-4" /> Set My Fitness Goal
          </Button>
        </div>
      )}

      {/* Progress tab */}
      {!isLoading && currentTab === 'progress' && activeGoal && (
        <FitnessProgressDashboard
          goal={activeGoal}
          onRefresh={() => { qc.invalidateQueries({ queryKey: ['fitnessGoals'] }); refetch(); }}
        />
      )}

      {/* Setup tab */}
      {(!isLoading && currentTab === 'setup') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {activeGoal ? 'Edit Fitness Goal' : 'Create Fitness Goal'}
            </p>
            {activeGoal && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Active</Badge>
            )}
          </div>
          <FitnessGoalSetup
            existing={activeGoal}
            onSaved={() => { qc.invalidateQueries({ queryKey: ['fitnessGoals'] }); refetch(); setTab('progress'); }}
            onCancel={hasGoal ? () => setTab('progress') : undefined}
          />
        </div>
      )}
    </div>
  );
}
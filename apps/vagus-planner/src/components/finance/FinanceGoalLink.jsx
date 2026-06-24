/**
 * Finance ↔ Goal Link — shows financial goals with progress from actual spending/savings data.
 * Unique Vagus cross-module feature: only possible because Finance + Goals live in the same app.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Target, ChevronRight, TrendingUp } from 'lucide-react';

export default function FinanceGoalLink() {
  const { data: goals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => base44.entities.Goal.filter({ category: 'financial', status: { $in: ['not_started', 'in_progress'] } }),
    staleTime: 60000,
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    staleTime: 30000,
  });

  const totalSavings = useMemo(() =>
    expenses.filter(e => e.type === 'saving').reduce((s, e) => s + (e.amount || 0), 0),
  [expenses]);

  if (goals.length === 0) return null;

  return (
    <Card className="border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 to-cyan-50/40 dark:from-blue-950/20 dark:to-cyan-950/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Financial Goals
          </p>
          <Link to={createPageUrl('Wellness')} className="text-xs text-blue-600 flex items-center gap-0.5 hover:underline">
            All goals <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-3">
          {goals.slice(0, 2).map(goal => {
            const progress = goal.progress || 0;
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate flex-1">{goal.title}</span>
                  <span className="text-xs font-bold text-blue-600 ml-2">{progress}%</span>
                </div>
                <div className="h-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
          {totalSavings > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-blue-100 dark:border-blue-900/30">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-xs text-slate-500">Total saved so far: <span className="font-bold text-emerald-600">${totalSavings.toFixed(0)}</span></p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
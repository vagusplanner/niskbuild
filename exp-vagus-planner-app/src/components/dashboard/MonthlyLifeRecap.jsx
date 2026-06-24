/**
 * Monthly Life Recap — AI-powered cross-module summary.
 * Combines: Calendar busyness, Finance health, Wellness score, Goal progress, Habits.
 * Unique to Vagus: only possible because all data lives in one app.
 * Adapts content for Islamic mode (adds prayer/Quran/fasting data).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function MonthlyLifeRecap({ islamicMode = false }) {
  const [expanded, setExpanded] = useState(false);
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const prevMonth = subMonths(now, 1);
  const monthLabel = format(prevMonth, 'MMMM yyyy');

  const { data: events = [] } = useQuery({ queryKey: ['todayEvents'], queryFn: () => SDK.entities.Event.list('-start_date', 100), staleTime: 60000 });
  const { data: tasks = [] } = useQuery({ queryKey: ['activeTasks'], queryFn: () => SDK.entities.Task.list('-due_date', 100), staleTime: 60000 });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => SDK.entities.Expense.list('-date', 200), staleTime: 60000 });
  const { data: goals = [] } = useQuery({ queryKey: ['activeGoals'], queryFn: () => SDK.entities.Goal.list(), staleTime: 60000 });
  const { data: prayerLogs = [] } = useQuery({ queryKey: ['prayerLogsAll'], queryFn: () => SDK.entities.PrayerLog.list('-date', 200), staleTime: 60000, enabled: islamicMode });

  const generateRecap = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(prevMonth);
      const end = endOfMonth(prevMonth);

      const monthEvents = events.filter(e => { const d = new Date(e.start_date); return d >= start && d <= end; });
      const monthExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const totalIncome = monthExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
      const totalSpending = monthExpenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length) : 0;

      let islamicSummary = '';
      if (islamicMode) {
        const monthPrayers = prayerLogs.filter(p => { const d = new Date(p.date); return d >= start && d <= end; });
        const prayerDays = [...new Set(monthPrayers.map(p => p.date))].length;
        islamicSummary = `Prayer tracking: ${prayerDays} days logged. `;
      }

      const prompt = `Generate a warm, motivating monthly life recap for ${monthLabel}.

Data summary:
- Calendar: ${monthEvents.length} events scheduled
- Tasks: ${completedTasks.length} tasks completed out of ${tasks.length} total
- Finance: Income $${totalIncome.toFixed(0)}, Spending $${totalSpending.toFixed(0)}, Net ${totalIncome - totalSpending >= 0 ? '+' : ''}$${(totalIncome - totalSpending).toFixed(0)}
- Goals: ${completedGoals} goals completed, average progress ${avgProgress}%
${islamicSummary}

Write a friendly 3-section recap:
1. 🌟 HIGHLIGHTS (2-3 bullet wins from the month)
2. 📊 PATTERNS (1-2 observations about their life balance)
3. 🚀 NEXT MONTH (2 specific, actionable suggestions)

Keep it personal, warm, and under 200 words total. ${islamicMode ? 'Include an Islamic perspective where relevant (barakah, gratitude, spiritual growth).' : ''}`;

      const result = await SDK.integrations.Core.InvokeLLM({ prompt });
      setRecap(result);
      setExpanded(true);
    } catch (e) {
      setRecap('Could not generate recap. Please try again.');
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-[#E8B84B]/30 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#E8B84B]/20 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/20">
              <TrendingUp className="w-4 h-4 text-[#E8B84B]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {islamicMode ? '🌙 Monthly Life & Faith Recap' : '📊 Monthly Life Recap'}
              </p>
              <p className="text-xs text-slate-500">{monthLabel} · AI-powered cross-module summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!recap && (
              <Button onClick={generateRecap} disabled={loading} size="sm"
                className="bg-gradient-to-r from-[#E8B84B] to-[#f0c060] text-[#071224] font-bold text-xs h-8 px-3">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            )}
            {recap && (
              <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && recap && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-[#E8B84B]/20">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{recap}</p>
                <button onClick={() => { setRecap(null); setExpanded(false); }}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">
                  Generate new recap
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
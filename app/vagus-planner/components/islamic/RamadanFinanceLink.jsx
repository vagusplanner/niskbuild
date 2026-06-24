import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, Sparkles, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export default function RamadanFinanceLink() {
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const queryClient = useQueryClient();

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split('T')[0];
  const monthEnd = endOfMonth(now).toISOString().split('T')[0];

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', monthStart],
    queryFn: () => base44.entities.Expense.filter({ date: { $gte: monthStart, $lte: monthEnd } }, '-date', 200),
    staleTime: 30000,
  });

  const { data: ramadanGoals = [] } = useQuery({
    queryKey: ['ramadanGoals'],
    queryFn: () => base44.entities.RamadanGoal.list('-created_date', 10),
    staleTime: 30000,
  });

  const { data: fastingRecords = [] } = useQuery({
    queryKey: ['fastingRecordsMonth', monthStart],
    queryFn: () => base44.entities.FastingRecord.filter({ date: { $gte: monthStart, $lte: monthEnd } }),
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const totalCharity = expenses.filter(e => e.type === 'sadaqa' || e.type === 'zakat' || e.category === 'charity').reduce((s, e) => s + (e.amount || 0), 0);
    const zakatDue = totalIncome * 0.025;
    const daysWithSadaqa = new Set(expenses.filter(e => e.type === 'sadaqa').map(e => e.date)).size;
    const fastingDays = fastingRecords.filter(f => f.completed).length;
    const charityGoal = ramadanGoals.find(g => g.goal_type === 'charity' || g.title?.toLowerCase().includes('sadaqa') || g.title?.toLowerCase().includes('charity'));
    const charityTarget = charityGoal?.target_amount || 0;
    const charityPct = charityTarget > 0 ? Math.min(100, (totalCharity / charityTarget) * 100) : 0;
    return { totalIncome, totalCharity, zakatDue, daysWithSadaqa, fastingDays, charityGoal, charityTarget, charityPct };
  }, [expenses, ramadanGoals, fastingRecords]);

  const logSadaqa = useMutation({
    mutationFn: (amount) => base44.entities.Expense.create({
      date: format(now, 'yyyy-MM-dd'),
      amount: parseFloat(amount),
      type: 'sadaqa',
      category: 'charity',
      description: 'Ramadan Sadaqa',
      is_sadaqa: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setQuickAmount('');
      toast.success('Sadaqa logged! May Allah accept it. 🤲');
    },
  });

  const getAISuggestion = async () => {
    setLoadingAI(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A Muslim has: monthly income $${stats.totalIncome.toFixed(0)}, has given $${stats.totalCharity.toFixed(0)} in charity this month, fasted ${stats.fastingDays} days. Ramadan context. 
        Give ONE specific, practical daily sadaqa suggestion (amount + cause + why) in 2 sentences. Be specific with the amount based on their income.`,
      });
      setAiSuggestion(result);
    } catch (_) {}
    setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 fill-white" />
          <span className="text-sm font-bold">Ramadan Charity Dashboard</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-black">${stats.totalCharity.toFixed(0)}</p>
            <p className="text-[10px] text-rose-100">Given This Month</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-black">{stats.daysWithSadaqa}</p>
            <p className="text-[10px] text-rose-100">Days of Sadaqa</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-xl font-black">${stats.zakatDue.toFixed(0)}</p>
            <p className="text-[10px] text-rose-100">Est. Zakat Due</p>
          </div>
        </div>

        {/* Progress toward Ramadan charity goal */}
        {stats.charityGoal && stats.charityTarget > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-rose-100 mb-1">
              <span>Ramadan Charity Goal</span>
              <span>{stats.charityPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.charityPct}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <p className="text-xs text-rose-100 mt-1">${stats.totalCharity.toFixed(0)} / ${stats.charityTarget} target</p>
          </div>
        )}
      </div>

      {/* Quick Sadaqa Log */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">🤲 Quick Sadaqa Log</p>
        <div className="flex gap-2 mb-3">
          {[1, 5, 10, 25].map(amt => (
            <button
              key={amt}
              onClick={() => logSadaqa.mutate(amt)}
              className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm font-bold hover:bg-rose-100 transition-colors border border-rose-200 dark:border-rose-800"
            >
              ${amt}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Custom amount"
            value={quickAmount}
            onChange={e => setQuickAmount(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => quickAmount && logSadaqa.mutate(parseFloat(quickAmount))}
            disabled={!quickAmount || logSadaqa.isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* AI Daily Sadaqa Suggestion */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Sadaqa Suggestion
          </p>
          <Button size="sm" onClick={getAISuggestion} disabled={loadingAI} className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white">
            {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Suggest'}
          </Button>
        </div>
        {aiSuggestion ? (
          <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            {aiSuggestion}
          </motion.p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Get a personalised daily Sadaqa recommendation based on your income and fasting progress.
          </p>
        )}
      </div>

      {/* Islamic giving tips */}
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">🌟 Ramadan Charity Virtues</p>
        <ul className="space-y-1.5">
          {[
            'The Prophet ﷺ was most generous in Ramadan — like an unobstructed wind',
            'Giving charity at Iftar time = reward for the faster',
            'Laylat al-Qadr: one night of charity = 1000 months of worship',
            'Even a smile is Sadaqa — make it your daily minimum'
          ].map((tip, i) => (
            <li key={i} className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1.5">
              <span className="text-emerald-500 flex-shrink-0 mt-0.5">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, PiggyBank, Plus, ChevronRight } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { motion } from 'framer-motion';

const CAT_COLORS = {
  food: '#f97316', transport: '#3b82f6', shopping: '#8b5cf6', bills: '#ef4444',
  health: '#ec4899', education: '#06b6d4', entertainment: '#a855f7', charity: '#10b981',
  fitness: '#f59e0b', other: '#94a3b8', salary: '#22c55e', freelance: '#14b8a6',
  investment: '#6366f1', gift: '#f59e0b', emergency: '#64748b',
};

export default function SpendingWidget() {
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split('T')[0];
  const monthEnd = endOfMonth(now).toISOString().split('T')[0];

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', monthStart],
    queryFn: () => base44.entities.Expense.filter({ date: { $gte: monthStart, $lte: monthEnd } }, '-date', 200),
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const totalExpense = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    const totalIncome  = expenses.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const totalSaving  = expenses.filter(e => e.type === 'saving').reduce((s, e) => s + (e.amount || 0), 0);
    const totalCharity = expenses.filter(e => e.type === 'sadaqa' || e.type === 'zakat').reduce((s, e) => s + (e.amount || 0), 0);

    const catMap = {};
    expenses.filter(e => e.type === 'expense').forEach(e => {
      const k = e.category || 'other';
      catMap[k] = (catMap[k] || 0) + (e.amount || 0);
    });
    const chartData = Object.entries(catMap).sort(([,a],[,b]) => b - a).slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    return { totalExpense, totalIncome, totalSaving, totalCharity, chartData };
  }, [expenses]);

  const onAddSave = () => {
    setShowAdd(false);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#0d6e8a] dark:text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gradient-to-r from-[#38bdf8] to-[#E8B84B] rounded-full inline-block" />
          Finance — {format(now, 'MMM yyyy')}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <Link to={createPageUrl('Finance')} className="text-xs text-teal-600 font-semibold flex items-center gap-0.5 hover:underline">
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 text-center">
          <p className="text-sm text-slate-400 mb-3">No entries this month</p>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="mx-auto">
            <Plus className="w-4 h-4 mr-1" /> Log First Entry
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-0.5">
                <TrendingDown className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">Spent</span>
              </div>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">${stats.totalExpense.toFixed(0)}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">Income</span>
              </div>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">${stats.totalIncome.toFixed(0)}</p>
            </div>
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                <PiggyBank className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase">Saved</span>
              </div>
              <p className="text-lg font-black text-slate-800 dark:text-slate-100">${stats.totalSaving.toFixed(0)}</p>
            </div>
          </div>

          {/* Chart + categories */}
          {stats.chartData.length > 0 && (
            <div className="flex items-center gap-3 px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="w-[88px] h-[88px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={22} outerRadius={40} dataKey="value" paddingAngle={3}>
                      {stats.chartData.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {stats.chartData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[item.name] || '#94a3b8' }} />
                    <span className="text-xs text-slate-500 flex-1 capitalize truncate">{item.name}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">${item.value.toFixed(0)}</span>
                  </div>
                ))}
                {stats.totalCharity > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                    <span className="text-xs text-slate-500 flex-1">Zakat/Sadaqa</span>
                    <span className="text-xs font-bold text-emerald-600">${stats.totalCharity.toFixed(0)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Financial Entry</DialogTitle></DialogHeader>
          <ExpenseForm onSave={onAddSave} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
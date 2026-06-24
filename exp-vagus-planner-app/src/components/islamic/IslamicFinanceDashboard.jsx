import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, Heart } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';

// Islamic finance categorization
const HALAL_CATEGORIES = ['food', 'transport', 'health', 'education', 'fitness', 'charity', 'salary', 'freelance', 'gift'];
const REVIEW_CATEGORIES = ['entertainment', 'shopping'];
const CHARITY_CATEGORIES = ['charity'];

const CATEGORY_STATUS = {
  food: 'halal', transport: 'halal', health: 'halal', education: 'halal',
  fitness: 'halal', charity: 'halal', salary: 'halal', freelance: 'halal',
  gift: 'halal', investment: 'review', entertainment: 'review',
  shopping: 'review', bills: 'halal', other: 'review', emergency: 'halal',
};

const STATUS_COLORS = { halal: '#10b981', review: '#f59e0b', haram: '#ef4444' };
const STATUS_LABELS = { halal: 'Halal ✓', review: 'Review ⚠️', haram: 'Avoid ✗' };

export default function IslamicFinanceDashboard() {
  const now = new Date();
  const monthStart = startOfMonth(now).toISOString().split('T')[0];
  const monthEnd = endOfMonth(now).toISOString().split('T')[0];

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', monthStart],
    queryFn: () => SDK.entities.Expense.filter({ date: { $gte: monthStart, $lte: monthEnd } }, '-date', 300),
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const onlyExpenses = expenses.filter(e => e.type === 'expense');
    const total = onlyExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const charity = expenses.filter(e => e.type === 'sadaqa' || e.type === 'zakat' || e.category === 'charity').reduce((s, e) => s + (e.amount || 0), 0);
    const zakat = expenses.filter(e => e.type === 'zakat').reduce((s, e) => s + (e.amount || 0), 0);

    const byStatus = { halal: 0, review: 0, haram: 0 };
    const chartData = [];
    const catMap = {};
    onlyExpenses.forEach(e => {
      const status = CATEGORY_STATUS[e.category] || 'review';
      byStatus[status] += e.amount || 0;
      catMap[status] = (catMap[status] || 0) + (e.amount || 0);
    });
    Object.entries(byStatus).forEach(([status, val]) => {
      if (val > 0) chartData.push({ name: STATUS_LABELS[status], value: val, status });
    });

    const zakatDue = total * 0.025; // rough estimate on net
    const charityPct = total > 0 ? (charity / total) * 100 : 0;

    return { total, charity, zakat, byStatus, chartData, zakatDue, charityPct };
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Halal/Haram overview */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
          <span className="text-base">⚖️</span> Islamic Finance Overview
        </h3>

        <div className="flex gap-3 mb-4">
          {/* Chart */}
          {stats.chartData.length > 0 && (
            <div className="w-[100px] h-[100px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value">
                    {stats.chartData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `$${v.toFixed(0)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex-1 space-y-2">
            {Object.entries(stats.byStatus).map(([status, val]) => val > 0 && (
              <div key={status} className="flex items-center gap-2">
                {status === 'halal' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  : status === 'review' ? <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                <span className="text-xs text-slate-600 dark:text-slate-400 capitalize flex-1">{status}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">${val.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review items list */}
        {stats.byStatus.review > 0 && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-3.5 h-3.5" /> Categories to review
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500">
              Entertainment & shopping — ensure all purchases are permissible (halal content, modest clothing, etc.)
            </p>
          </div>
        )}
      </div>

      {/* Charity summary — full Zakat dashboard is in Finance > Zakāt tab */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-3 text-center">
          <Heart className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-lg font-black text-purple-700 dark:text-purple-400">${stats.charity.toFixed(0)}</p>
          <p className="text-[10px] text-purple-500 font-semibold">Charity This Month</p>
          <p className="text-[10px] text-slate-400">{stats.charityPct.toFixed(1)}% of spending</p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
          <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-black text-amber-700 dark:text-amber-400">{stats.charityPct.toFixed(1)}%</p>
          <p className="text-[10px] text-amber-500 font-semibold">of Spending to Charity</p>
          <p className="text-[10px] text-slate-400">Full Zakāt in Finance tab</p>
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">💡 Islamic Finance Tips</p>
        <ul className="space-y-1.5">
          {[
            'Avoid interest (riba) in savings and loans — choose Islamic banking',
            'Give at least 2.5% of savings in Zakat annually',
            'Aim to donate 10% of income as Sadaqah',
            'Check investments for Shariah compliance (no alcohol, gambling, tobacco)'
          ].map((tip, i) => (
            <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
              <span className="text-emerald-500 mt-0.5">•</span> {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
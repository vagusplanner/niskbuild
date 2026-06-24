import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { TrendingUp, TrendingDown, PiggyBank, Heart, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CAT_COLORS = {
  food: '#f97316', transport: '#3b82f6', shopping: '#8b5cf6', bills: '#ef4444',
  health: '#ec4899', education: '#06b6d4', entertainment: '#a855f7', charity: '#10b981',
  fitness: '#f59e0b', other: '#94a3b8', emergency: '#64748b',
};

const CAT_LABELS = {
  food: 'Food', transport: 'Transport', shopping: 'Shopping', bills: 'Bills',
  health: 'Health', education: 'Education', entertainment: 'Entertainment',
  fitness: 'Fitness', charity: 'Charity', other: 'Other', emergency: 'Emergency',
};

const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$' };

export default function FinanceSummary({ onAddEntry, currency = 'USD' }) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const now = new Date();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => SDK.auth.me() });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', user?.email],
    queryFn: () => user?.email
      ? SDK.entities.Expense.filter({ created_by: user.email }, '-date', 500)
      : Promise.resolve([]),
    enabled: !!user?.email,
  });

  const monthData = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const month = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });

    const income   = month.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const spending = month.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const savings  = month.filter(e => e.type === 'saving').reduce((s, e) => s + e.amount, 0);
    const charity  = month.filter(e => e.type === 'zakat' || e.type === 'sadaqa').reduce((s, e) => s + e.amount, 0);
    const net      = income - spending - savings - charity;

    const catMap = {};
    month.filter(e => e.type === 'expense').forEach(e => {
      catMap[e.category || 'other'] = (catMap[e.category || 'other'] || 0) + e.amount;
    });
    const chartData = Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name: CAT_LABELS[name] || name, rawName: name, value }));

    return { income, spending, savings, charity, net, chartData };
  }, [expenses]);

  // Last 6 months bar chart
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(now, 5 - i);
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const month = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end; });
      return {
        name: format(m, 'MMM'),
        Income: month.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
        Expenses: month.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

  const statCards = [
    { label: 'Income', value: monthData.income, icon: TrendingUp, color: 'text-emerald-600', bg: 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30', border: 'border-emerald-200 dark:border-emerald-900', prefix: '+', },
    { label: 'Spending', value: monthData.spending, icon: TrendingDown, color: 'text-red-600', bg: 'from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30', border: 'border-red-200 dark:border-red-900', prefix: '-', },
    { label: 'Savings', value: monthData.savings, icon: PiggyBank, color: 'text-blue-600', bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30', border: 'border-blue-200 dark:border-blue-900', prefix: '', },
    { label: 'Charity', value: monthData.charity, icon: Heart, color: 'text-purple-600', bg: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30', border: 'border-purple-200 dark:border-purple-900', prefix: '', },
  ];

  if (expenses.length === 0) {
    return (
      <Card className="border-dashed mt-4">
        <CardContent className="p-10 text-center">
          <div className="text-5xl mb-4">💰</div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No transactions yet</h3>
          <p className="text-sm text-slate-500 mb-5">Start logging your income and expenses to see insights here.</p>
          <Button onClick={onAddEntry} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1.5" /> Log First Entry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Month label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{format(now, 'MMMM yyyy')} Summary</p>
        <div className={`text-sm font-black ${monthData.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          Net: {monthData.net >= 0 ? '+' : ''}{sym}{monthData.net.toFixed(0)}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg, border, prefix }) => (
          <Card key={label} className={`bg-gradient-to-br ${bg} ${border}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{prefix}{sym}{value.toFixed(0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pie + category breakdown */}
      {monthData.chartData.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Spending by Category</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={monthData.chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {monthData.chartData.map((entry, i) => (
                        <Cell key={i} fill={CAT_COLORS[entry.rawName] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {monthData.chartData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[item.rawName] || '#94a3b8' }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{sym}{item.value.toFixed(0)}</span>
                    <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.value / monthData.spending) * 100)}%`, background: CAT_COLORS[item.rawName] || '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6-month trend */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => `$${v.toFixed(0)}`} />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
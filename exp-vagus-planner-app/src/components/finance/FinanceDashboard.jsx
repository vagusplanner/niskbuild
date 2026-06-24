import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, TrendingUp, DollarSign, PieChart, Brain } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { PieChart as RechartPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ExpenseForm, { CATEGORY_LABELS, TYPE_COLORS } from './ExpenseForm';
import AIFinanceAdvisor from './AIFinanceAdvisor';

const COLORS = {
  food: '#f59e0b', transport: '#3b82f6', shopping: '#ec4899',
  bills: '#8b5cf6', health: '#ef4444', education: '#06b6d4',
  entertainment: '#14b8a6', fitness: '#f97316', charity: '#a855f7',
  other: '#6b7280'
};

export default function FinanceDashboard() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => SDK.entities.Expense.list('-date', 200)
  });

  // Current month data
  const monthData = React.useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });

    const income = monthExpenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const spending = monthExpenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const savings = monthExpenses.filter(e => e.type === 'saving').reduce((sum, e) => sum + e.amount, 0);
    const charity = monthExpenses.filter(e => e.type === 'zakat' || e.type === 'sadaqa').reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = {};
    monthExpenses.filter(e => e.type === 'expense').forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    const chartData = Object.entries(categoryBreakdown).map(([name, value]) => ({
      name: CATEGORY_LABELS[name] || name,
      value,
      color: COLORS[name] || COLORS.other
    }));

    return { income, spending, savings, charity, chartData };
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">Finance</h1>
          <p className="text-sm text-slate-500">Track income, expenses & savings</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" />
          Add Entry
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">
            <PieChart className="w-4 h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="w-4 h-4 mr-1" />
            AI Advisor
          </TabsTrigger>
          <TabsTrigger value="history">
            <TrendingUp className="w-4 h-4 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Monthly Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-emerald-600 font-semibold mb-1">Income</p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">${monthData.income.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-red-600 font-semibold mb-1">Spending</p>
                <p className="text-2xl font-black text-red-700 dark:text-red-300">${monthData.spending.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-blue-600 font-semibold mb-1">Savings</p>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-300">${monthData.savings.toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-900">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-purple-600 font-semibold mb-1">Charity</p>
                <p className="text-2xl font-black text-purple-700 dark:text-purple-300">${monthData.charity.toFixed(0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Spending Breakdown Chart */}
          {monthData.chartData.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RechartPie>
                    <Pie
                      data={monthData.chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {monthData.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </RechartPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai">
          <AIFinanceAdvisor />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {expenses.slice(0, 30).map(exp => (
            <Card key={exp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-1.5 h-12 rounded-full ${TYPE_COLORS[exp.type]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {exp.description || CATEGORY_LABELS[exp.category] || exp.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(exp.date), 'MMM d, yyyy')} • {exp.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${
                    exp.type === 'income' ? 'text-emerald-600' :
                    exp.type === 'expense' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {exp.type === 'income' ? '+' : exp.type === 'expense' ? '-' : ''}${exp.amount.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {expenses.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No transactions yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Financial Entry</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSave={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
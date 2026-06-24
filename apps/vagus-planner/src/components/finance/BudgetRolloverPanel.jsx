/**
 * BudgetRolloverPanel — Native recurring budget WITH rollover.
 * If user spends under budget, carry-forward goes to next month automatically.
 * Shows AI spending forecasts based on historical patterns.
 * Stored in localStorage (budget limits) + Expense entity (actuals).
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Sparkles, Loader2, Plus, Trash2, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { toast } from 'sonner';

const CAT_LABELS = {
  food: '🍔 Food', transport: '🚗 Transport', shopping: '🛍️ Shopping', bills: '💡 Bills',
  health: '❤️ Health', education: '📚 Education', entertainment: '🎬 Entertainment',
  fitness: '🏋️ Fitness', charity: '🤲 Charity', other: '📦 Other', emergency: '🛡️ Emergency',
};
const CAT_COLORS = {
  food: '#f97316', transport: '#3b82f6', shopping: '#8b5cf6', bills: '#ef4444',
  health: '#ec4899', education: '#06b6d4', entertainment: '#a855f7', charity: '#10b981',
  fitness: '#f59e0b', other: '#94a3b8', emergency: '#64748b',
};

const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$', TRY: '₺', PKR: '₨' };
const BUDGET_KEY = 'vagus_budgets_v2';
const ROLLOVER_KEY = 'vagus_rollover_v2';

function loadBudgets() { try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}'); } catch { return {}; } }
function saveBudgets(b) { localStorage.setItem(BUDGET_KEY, JSON.stringify(b)); }
function loadRollovers() { try { return JSON.parse(localStorage.getItem(ROLLOVER_KEY) || '{}'); } catch { return {}; } }
function saveRollovers(r) { localStorage.setItem(ROLLOVER_KEY, JSON.stringify(r)); }

export default function BudgetRolloverPanel({ currency = 'USD' }) {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  const [budgets, setBudgets] = useState(loadBudgets);
  const [rollovers, setRollovers] = useState(loadRollovers);
  const [addCat, setAddCat] = useState('food');
  const [addAmt, setAddAmt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const currentMonthKey = format(now, 'yyyy-MM');
  const prevMonthKey = format(subMonths(now, 1), 'yyyy-MM');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500),
    staleTime: 30000,
  });

  // Current month spending
  const monthSpending = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const map = {};
    expenses.filter(e => {
      const d = new Date(e.date);
      return e.type === 'expense' && d >= start && d <= end;
    }).forEach(e => { map[e.category || 'other'] = (map[e.category || 'other'] || 0) + e.amount; });
    return map;
  }, [expenses]);

  // Previous month spending (for rollover calc)
  const prevMonthSpending = useMemo(() => {
    const start = startOfMonth(subMonths(now, 1));
    const end = endOfMonth(subMonths(now, 1));
    const map = {};
    expenses.filter(e => {
      const d = new Date(e.date);
      return e.type === 'expense' && d >= start && d <= end;
    }).forEach(e => { map[e.category || 'other'] = (map[e.category || 'other'] || 0) + e.amount; });
    return map;
  }, [expenses]);

  // Auto-compute rollover from previous month if not already recorded
  const computedRollovers = useMemo(() => {
    const result = { ...rollovers };
    Object.entries(budgets).forEach(([cat, limit]) => {
      const rolloverKey = `${prevMonthKey}_${cat}`;
      if (!result[rolloverKey]) {
        const prevSpent = prevMonthSpending[cat] || 0;
        const saved = Math.max(0, limit - prevSpent);
        if (saved > 0) result[rolloverKey] = saved;
      }
    });
    return result;
  }, [budgets, prevMonthSpending, prevMonthKey, rollovers]);

  const getRollover = (cat) => {
    return computedRollovers[`${prevMonthKey}_${cat}`] || 0;
  };

  const persist = (updated) => { setBudgets(updated); saveBudgets(updated); };

  const handleAdd = () => {
    if (!addAmt || isNaN(parseFloat(addAmt)) || parseFloat(addAmt) <= 0) { toast.error('Enter a valid amount'); return; }
    persist({ ...budgets, [addCat]: parseFloat(addAmt) });
    setAddAmt('');
    setShowAdd(false);
    toast.success(`Budget set for ${CAT_LABELS[addCat] || addCat}`);
  };

  const handleDelete = (cat) => {
    const updated = { ...budgets };
    delete updated[cat];
    persist(updated);
  };

  const handleAISuggest = async () => {
    if (expenses.length < 3) { toast.error('Log at least 3 transactions first.'); return; }
    setAiLoading(true);
    try {
      const start3m = startOfMonth(subMonths(now, 2));
      const recent = expenses.filter(e => e.type === 'expense' && new Date(e.date) >= start3m);
      const catTotals = {};
      recent.forEach(e => { catTotals[e.category || 'other'] = (catTotals[e.category || 'other'] || 0) + e.amount; });
      const summary = Object.entries(catTotals).map(([cat, total]) => `${cat}: ${sym}${(total / 3).toFixed(0)}/mo avg`).join(', ');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `User avg monthly spending: ${summary}. Suggest realistic monthly budget limits per category with ~10% buffer. Return JSON: {budgets: {category: number}}`,
        response_json_schema: { type: 'object', properties: { budgets: { type: 'object', additionalProperties: { type: 'number' } } } }
      });
      if (result?.budgets && Object.keys(result.budgets).length > 0) {
        persist({ ...budgets, ...result.budgets });
        toast.success(`AI set ${Object.keys(result.budgets).length} budgets!`);
      }
    } catch { toast.error('AI suggestion failed.'); }
    setAiLoading(false);
  };

  const handleAIForecast = async () => {
    if (expenses.length < 5) { toast.error('Need more transactions for forecasting.'); return; }
    setAiLoading(true);
    try {
      const months = Array.from({ length: 3 }, (_, i) => {
        const m = subMonths(now, i + 1);
        const start = startOfMonth(m);
        const end = endOfMonth(m);
        const total = expenses.filter(e => e.type === 'expense' && new Date(e.date) >= start && new Date(e.date) <= end).reduce((s, e) => s + e.amount, 0);
        return { month: format(m, 'MMM yyyy'), total };
      }).reverse();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on last 3 months spending: ${months.map(m => `${m.month}: ${sym}${m.total.toFixed(0)}`).join(', ')}.
Forecast next month's total spending and give 3 specific AI tips to reduce costs. Return JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            forecast_amount: { type: 'number' },
            trend: { type: 'string' },
            tips: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setForecast(result);
    } catch { toast.error('Forecast failed.'); }
    setAiLoading(false);
  };

  const budgetEntries = Object.entries(budgets);
  const availableCats = Object.keys(CAT_LABELS).filter(c => !budgets[c]);

  return (
    <div className="space-y-4 mt-4">
      {/* AI controls */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleAISuggest} disabled={aiLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          AI Suggest Budgets
        </Button>
        <Button onClick={handleAIForecast} disabled={aiLoading} size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
          AI Spending Forecast
        </Button>
        <Button onClick={() => setShowAdd(p => !p)} size="sm" variant="outline" className="text-xs ml-auto">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Budget
        </Button>
      </div>

      {/* AI Forecast result */}
      {forecast && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">AI Spending Forecast — Next Month</span>
          </div>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300 mb-2">
            {sym}{forecast.forecast_amount?.toFixed(0)} <span className="text-sm font-normal text-indigo-500">projected</span>
          </p>
          {forecast.trend && <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2 italic">{forecast.trend}</p>}
          {forecast.tips?.length > 0 && (
            <ul className="space-y-1">
              {forecast.tips.map((tip, i) => (
                <li key={i} className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />{tip}
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      )}

      {/* Add budget form */}
      {showAdd && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Set Monthly Budget</p>
            <div className="flex gap-2">
              <select value={addCat} onChange={e => setAddCat(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {(availableCats.length > 0 ? availableCats : Object.keys(CAT_LABELS)).map(c => (
                  <option key={c} value={c}>{CAT_LABELS[c] || c}</option>
                ))}
              </select>
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{sym}</span>
                <Input type="number" placeholder="0" value={addAmt} onChange={e => setAddAmt(e.target.value)}
                  className="pl-6" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              </div>
              <Button onClick={handleAdd} size="sm" className="bg-emerald-600 hover:bg-emerald-700">Set</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget progress cards with rollover */}
      {budgetEntries.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No budgets yet. Use AI to suggest or add manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetEntries.map(([cat, limit]) => {
            const spent = monthSpending[cat] || 0;
            const rollover = getRollover(cat);
            const effectiveLimit = limit + rollover;
            const pct = Math.min(100, (spent / effectiveLimit) * 100);
            const isOver = spent > effectiveLimit;
            const isNear = !isOver && pct >= 80;
            const remaining = effectiveLimit - spent;

            return (
              <Card key={cat} className={isOver ? 'border-red-200 dark:border-red-900' : isNear ? 'border-amber-200 dark:border-amber-900' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{CAT_LABELS[cat] || cat}</span>
                      {isOver && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Over</Badge>}
                      {isNear && !isOver && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Near limit</Badge>}
                      {!isOver && !isNear && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] py-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />On track</Badge>}
                      {rollover > 0 && (
                        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] py-0 flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" />+{sym}{rollover.toFixed(0)} rollover
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{sym}{spent.toFixed(0)} / {sym}{effectiveLimit.toFixed(0)}</span>
                      <button onClick={() => handleDelete(cat)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2"
                    indicatorClassName={isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : ''}
                    style={!isOver && !isNear ? { '--tw-bg-opacity': 1 } : {}}
                  />
                  <p className="text-xs mt-1 text-slate-400">
                    {isOver
                      ? `${sym}${Math.abs(remaining).toFixed(0)} over budget`
                      : `${sym}${remaining.toFixed(0)} remaining (base ${sym}${limit.toFixed(0)}${rollover > 0 ? ` + ${sym}${rollover.toFixed(0)} carried forward` : ''})`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
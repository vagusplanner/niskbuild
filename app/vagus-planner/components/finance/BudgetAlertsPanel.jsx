/**
 * Budget Alerts Panel
 * - Users set monthly budget limits per category
 * - AI suggests budget limits based on their spending history
 * - Shows progress bars and alerts when over/near limit
 * - Stored in localStorage (simple, no new entity needed)
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Sparkles, Loader2, Plus, Trash2, Target } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
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

const BUDGET_KEY = 'vagus_budgets_v1';

function loadBudgets() {
  try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}'); } catch { return {}; }
}
function saveBudgets(b) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b));
}

export default function BudgetAlertsPanel() {
  const [budgets, setBudgets] = useState(loadBudgets);
  const [editing, setEditing] = useState(null); // { cat, value }
  const [addCat, setAddCat] = useState('food');
  const [addAmt, setAddAmt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const now = new Date();
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500),
  });

  // Current month spending by category
  const monthSpending = useMemo(() => {
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const map = {};
    expenses.filter(e => {
      const d = new Date(e.date);
      return e.type === 'expense' && d >= start && d <= end;
    }).forEach(e => {
      map[e.category || 'other'] = (map[e.category || 'other'] || 0) + e.amount;
    });
    return map;
  }, [expenses]);

  const persist = (updated) => {
    setBudgets(updated);
    saveBudgets(updated);
  };

  const handleAdd = () => {
    if (!addAmt || isNaN(parseFloat(addAmt)) || parseFloat(addAmt) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    persist({ ...budgets, [addCat]: parseFloat(addAmt) });
    setAddAmt('');
    toast.success(`Budget set for ${CAT_LABELS[addCat] || addCat}`);
  };

  const handleDelete = (cat) => {
    const updated = { ...budgets };
    delete updated[cat];
    persist(updated);
  };

  const handleAISuggest = async () => {
    if (expenses.length < 3) {
      toast.error('Log at least 3 transactions first so AI can analyze your spending.');
      return;
    }
    setAiLoading(true);
    try {
      // Summarize last 3 months spending
      const start3m = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      const recent = expenses.filter(e => e.type === 'expense' && new Date(e.date) >= start3m);
      const catTotals = {};
      recent.forEach(e => {
        catTotals[e.category || 'other'] = (catTotals[e.category || 'other'] || 0) + e.amount;
      });
      const summary = Object.entries(catTotals).map(([cat, total]) => `${cat}: $${(total / 3).toFixed(0)}/month avg`).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this user's average monthly spending: ${summary}
Suggest realistic monthly budget limits for each category. Add a small buffer (10-15%) above their average to be achievable.
Return as JSON with category names as keys and dollar amounts as values. Only include categories that appear in the spending data.`,
        response_json_schema: {
          type: 'object',
          properties: {
            budgets: {
              type: 'object',
              additionalProperties: { type: 'number' }
            }
          }
        }
      });

      if (result?.budgets && Object.keys(result.budgets).length > 0) {
        const merged = { ...budgets, ...result.budgets };
        persist(merged);
        toast.success(`AI suggested ${Object.keys(result.budgets).length} budget limits!`);
      } else {
        toast.error('AI could not generate suggestions. Log more transactions first.');
      }
    } catch (e) {
      toast.error('AI suggestion failed. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const budgetEntries = Object.entries(budgets);
  const availableCats = Object.keys(CAT_LABELS).filter(c => !budgets[c]);

  return (
    <div className="space-y-4 mt-4">
      {/* AI Suggest Button */}
      <Card className="border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">AI Budget Suggestions</p>
            <p className="text-xs text-slate-500">Let AI analyze your spending history and suggest smart budget limits</p>
          </div>
          <Button onClick={handleAISuggest} disabled={aiLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0">
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {aiLoading ? 'Analyzing...' : 'Suggest Budgets'}
          </Button>
        </CardContent>
      </Card>

      {/* Add Manual Budget */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Set Monthly Budget
          </p>
          <div className="flex gap-2">
            <select
              value={addCat}
              onChange={e => setAddCat(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {(availableCats.length > 0 ? availableCats : Object.keys(CAT_LABELS)).map(c => (
                <option key={c} value={c}>{CAT_LABELS[c] || c}</option>
              ))}
            </select>
            <div className="relative w-28">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <Input type="number" placeholder="0" value={addAmt} onChange={e => setAddAmt(e.target.value)}
                className="pl-6" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <Button onClick={handleAdd} size="sm" className="bg-emerald-600 hover:bg-emerald-700">Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Budget Progress Cards */}
      {budgetEntries.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No budgets set yet. Use AI to suggest or add manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgetEntries.map(([cat, limit]) => {
            const spent = monthSpending[cat] || 0;
            const pct = Math.min(100, (spent / limit) * 100);
            const isOver = spent > limit;
            const isNear = !isOver && pct >= 80;
            const remaining = limit - spent;

            return (
              <Card key={cat} className={`${isOver ? 'border-red-200 dark:border-red-900' : isNear ? 'border-amber-200 dark:border-amber-900' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{CAT_LABELS[cat] || cat}</span>
                      {isOver && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Over Budget</Badge>}
                      {isNear && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] py-0"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />Near Limit</Badge>}
                      {!isOver && !isNear && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] py-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />On Track</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">${spent.toFixed(0)} / ${limit.toFixed(0)}</span>
                      <button onClick={() => handleDelete(cat)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%`, backgroundColor: !isOver && !isNear ? CAT_COLORS[cat] : undefined }}
                    />
                  </div>
                  <p className="text-xs mt-1.5 text-slate-400">
                    {isOver
                      ? `$${Math.abs(remaining).toFixed(0)} over budget this month`
                      : `$${remaining.toFixed(0)} remaining (${(100 - pct).toFixed(0)}% left)`}
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
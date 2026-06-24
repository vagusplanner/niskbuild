import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const CATEGORIES = {
  expense: ['food', 'transport', 'shopping', 'bills', 'health', 'education', 'entertainment', 'fitness', 'charity', 'other'],
  income:  ['salary', 'freelance', 'investment', 'gift', 'other'],
  saving:  ['emergency', 'investment', 'goal', 'other'],
  zakat:   ['other'],
  sadaqa:  ['charity', 'other'],
};

export const CATEGORY_LABELS = {
  food: '🍔 Food', transport: '🚗 Transport', shopping: '🛍️ Shopping',
  bills: '💡 Bills', health: '❤️ Health', education: '📚 Education',
  entertainment: '🎬 Entertainment', fitness: '🏋️ Fitness', charity: '🤲 Charity',
  other: '📦 Other', salary: '💼 Salary', freelance: '💻 Freelance',
  investment: '📈 Investment', gift: '🎁 Gift', emergency: '🛡️ Emergency',
  goal: '🎯 Goal',
};

export const TYPE_COLORS = {
  expense: 'bg-red-500', income: 'bg-emerald-500',
  saving: 'bg-blue-500', zakat: 'bg-amber-500', sadaqa: 'bg-purple-500',
};

const DEFAULT_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  type: 'expense',
  category: 'other',
  description: '',
  is_zakat_deductible: false,
  is_sadaqa: false,
  linked_goal_id: '',
  linked_habit_id: '',
};

export default function ExpenseForm({ onSave, compact = false, defaultType = 'expense' }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT_FORM, type: defaultType, category: CATEGORIES[defaultType]?.[0] || 'other' });

  const { data: goals = [] } = useQuery({
    queryKey: ['activeGoals'],
    queryFn: () => SDK.entities.Goal.filter({ status: { $in: ['not_started', 'in_progress'] } }),
    staleTime: 60000,
  });

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: () => SDK.entities.Habit.list(),
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: (data) => SDK.entities.Expense.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      // Auto-create CharitableGiving record for sadaqa/zakat entries
      if (form.is_sadaqa || form.type === 'sadaqa' || form.type === 'zakat') {
        await SDK.entities.CharitableGiving.create({
          type: form.type === 'zakat' ? 'zakat' : 'sadaqa',
          amount: parseFloat(form.amount),
          date: form.date,
          description: form.description || (form.type === 'zakat' ? 'Zakat' : 'Sadaqa'),
        }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['zakatPayments'] });
      }
      toast.success('Entry logged!');
      setForm({ ...DEFAULT_FORM, type: form.type, category: CATEGORIES[form.type]?.[0] || 'other' });
      onSave?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    mutation.mutate({
      ...form,
      amount: parseFloat(form.amount),
      linked_goal_id: form.linked_goal_id || undefined,
      linked_habit_id: form.linked_habit_id || undefined,
    });
  };

  const setType = (t) => setForm(f => ({ ...f, type: t, category: CATEGORIES[t]?.[0] || 'other' }));

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Type pills */}
      <div className="grid grid-cols-5 gap-1.5">
        {['expense', 'income', 'saving', 'zakat', 'sadaqa'].map(t => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
              form.type === t ? `${TYPE_COLORS[t]} text-white shadow-sm` : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input type="number" step="0.01" min="0" placeholder="0.00"
              value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              className="pl-7" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={form.date}
            onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(CATEGORIES[form.type] || CATEGORIES.expense).map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Description (optional)</Label>
        <Input placeholder="What was this for?"
          value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      {!compact && (
        <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          {goals.length > 0 && (
            <div>
              <Label className="text-xs">Link to Goal (optional)</Label>
              <Select value={form.linked_goal_id} onValueChange={(v) => setForm(f => ({ ...f, linked_goal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— None —</SelectItem>
                  {goals.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {habits.length > 0 && (
            <div>
              <Label className="text-xs">Link to Habit (optional)</Label>
              <Select value={form.linked_habit_id} onValueChange={(v) => setForm(f => ({ ...f, linked_habit_id: v }))}>
                <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>— None —</SelectItem>
                  {habits.map(h => <SelectItem key={h.id} value={h.id}>{h.name || h.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <Switch checked={form.is_zakat_deductible}
                onCheckedChange={(v) => setForm(f => ({ ...f, is_zakat_deductible: v }))} />
              Zakat deductible
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <Switch checked={form.is_sadaqa}
                onCheckedChange={(v) => setForm(f => ({ ...f, is_sadaqa: v }))} />
              Sadaqa
            </label>
          </div>
        </div>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        <Save className="w-4 h-4 mr-1" />
        {mutation.isPending ? 'Saving...' : 'Log Entry'}
      </Button>
    </form>
  );
}
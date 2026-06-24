/**
 * SmartExpenseForm — Redesigned log financial entry form.
 * Clean card-based layout with type selector, amount hero, AI auto-categorize.
 */
import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export const CATEGORIES = {
  expense: ['food', 'transport', 'shopping', 'bills', 'health', 'education', 'entertainment', 'fitness', 'charity', 'emergency', 'other'],
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

export const TYPE_CONFIG = {
  expense: { label: 'Expense',  emoji: '💸', gradient: 'from-red-500 to-rose-500',     light: 'bg-red-50 border-red-200 text-red-700',     dark: 'dark:bg-red-950/30 dark:border-red-800 dark:text-red-300' },
  income:  { label: 'Income',   emoji: '💰', gradient: 'from-emerald-500 to-green-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', dark: 'dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300' },
  saving:  { label: 'Saving',   emoji: '🏦', gradient: 'from-blue-500 to-cyan-500',     light: 'bg-blue-50 border-blue-200 text-blue-700',    dark: 'dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300' },
  zakat:   { label: 'Zakāt',    emoji: '⚖️', gradient: 'from-amber-500 to-yellow-500',  light: 'bg-amber-50 border-amber-200 text-amber-700',  dark: 'dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300' },
  sadaqa:  { label: 'Sadaqa',   emoji: '🤲', gradient: 'from-purple-500 to-violet-500', light: 'bg-purple-50 border-purple-200 text-purple-700', dark: 'dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300' },
};

// Keep this export for backwards compat
export const TYPE_COLORS = { expense: 'bg-red-500', income: 'bg-emerald-500', saving: 'bg-blue-500', zakat: 'bg-amber-500', sadaqa: 'bg-purple-500' };

const DEFAULT_FORM = {
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  type: 'expense',
  category: 'other',
  description: '',
};

export default function SmartExpenseForm({ onSave, defaultType = 'expense' }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULT_FORM, type: defaultType, category: CATEGORIES[defaultType]?.[0] || 'other' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  const setType = (t) => {
    setForm(f => ({ ...f, type: t, category: CATEGORIES[t]?.[0] || 'other' }));
    setAiSuggested(false);
  };

  const handleDescriptionBlur = async () => {
    if (!form.description || form.type !== 'expense' || form.description.length < 3) return;
    setAiLoading(true);
    try {
      const result = await SDK.integrations.Core.InvokeLLM({
        prompt: `Categorize this expense into exactly one: food, transport, shopping, bills, health, education, entertainment, fitness, charity, emergency, other.
Description: "${form.description}". Return JSON: {category: string}`,
        response_json_schema: { type: 'object', properties: { category: { type: 'string' } } }
      });
      const suggested = result?.category?.toLowerCase().trim();
      if (CATEGORIES.expense.includes(suggested) && suggested !== form.category) {
        setForm(f => ({ ...f, category: suggested }));
        setAiSuggested(true);
      }
    } catch {}
    setAiLoading(false);
  };

  const mutation = useMutation({
    mutationFn: (data) => SDK.entities.Expense.create(data),
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (vars.is_sadaqa || vars.type === 'sadaqa' || vars.type === 'zakat') {
        await SDK.entities.CharitableGiving.create({
          type: vars.type === 'zakat' ? 'zakat' : 'sadaqa',
          amount: vars.amount, date: vars.date,
          description: vars.description || (vars.type === 'zakat' ? 'Zakat' : 'Sadaqa'),
        }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['zakatPayments'] });
      }
      toast.success('Entry logged!');
      setForm({ ...DEFAULT_FORM, type: form.type, category: CATEGORIES[form.type]?.[0] || 'other' });
      setAiSuggested(false);
      onSave?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    mutation.mutate({ ...form, amount: parseFloat(form.amount) });
  };

  const cfg = TYPE_CONFIG[form.type];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Type selector — horizontal pill row */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Transaction Type</p>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(TYPE_CONFIG).map(([t, c]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center ${
                form.type === t
                  ? `bg-gradient-to-br ${c.gradient} border-transparent text-white shadow-md`
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
              }`}>
              <span className="text-base leading-none">{c.emoji}</span>
              <span className="text-[10px] font-bold leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount — large prominent input */}
      <div className={`rounded-2xl border-2 p-4 transition-all ${cfg.light} ${cfg.dark}`}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-2">{cfg.emoji} {cfg.label} Amount</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black opacity-60">£</span>
          <input
            type="number" step="0.01" min="0" placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="flex-1 text-3xl font-black bg-transparent border-none outline-none placeholder-current/30 w-0"
            style={{ color: 'inherit' }}
            autoFocus
          />
        </div>
      </div>

      {/* Description + AI */}
      <div>
        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
          Description
          {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
          {aiSuggested && !aiLoading && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 py-0 px-1.5">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI categorized
            </Badge>
          )}
        </Label>
        <Input
          placeholder={form.type === 'income' ? 'e.g. Monthly salary, Freelance project…' : 'e.g. Grocery shopping, Monthly rent…'}
          value={form.description}
          onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setAiSuggested(false); }}
          onBlur={handleDescriptionBlur}
          className="h-10"
        />
        {form.type === 'expense' && !aiSuggested && (
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Category auto-suggested from description
          </p>
        )}
      </div>

      {/* Date + Category — 2 col */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date</Label>
          <Input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="h-10" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            Category
            {aiSuggested && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
          </Label>
          <Select value={form.category} onValueChange={v => { setForm(f => ({ ...f, category: v })); setAiSuggested(false); }}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(CATEGORIES[form.type] || CATEGORIES.expense).map(c => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] || c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending}
        className={`w-full h-11 font-bold text-white bg-gradient-to-r ${cfg.gradient} hover:opacity-90 shadow-md`}>
        {mutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</>
          : <>{cfg.emoji} Log {cfg.label}</>
        }
      </Button>
    </form>
  );
}
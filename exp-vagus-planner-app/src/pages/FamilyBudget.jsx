import React, { useState, useMemo } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, startOfMonth } from 'date-fns';
import {
  PlusCircle, Sparkles, TrendingDown, TrendingUp, Target,
  Loader2, ChevronLeft, ChevronRight, Trash2, AlertCircle,
  CheckCircle2, DollarSign, Star, BookOpen, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORIES = [
  { key: 'groceries',     label: 'Groceries',     emoji: '🛒', color: '#3ecfa0' },
  { key: 'dining',        label: 'Dining Out',    emoji: '🍽️', color: '#E8B84B' },
  { key: 'transport',     label: 'Transport',     emoji: '🚗', color: '#38bdf8' },
  { key: 'utilities',     label: 'Utilities',     emoji: '⚡', color: '#818cf8' },
  { key: 'clothing',      label: 'Clothing',      emoji: '👗', color: '#f472b6' },
  { key: 'education',     label: 'Education',     emoji: '📚', color: '#34d399' },
  { key: 'health',        label: 'Health',        emoji: '💊', color: '#fb7185' },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#a78bfa' },
  { key: 'sadaqah',       label: 'Sadaqah',       emoji: '🤲', color: '#fbbf24' },
  { key: 'savings',       label: 'Savings',       emoji: '💰', color: '#4ade80' },
  { key: 'other',         label: 'Other',         emoji: '📌', color: '#94a3b8' },
];

const getCat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

function monthStr(date) {
  return format(date, 'yyyy-MM');
}

function AddEntryModal({ month, user, familyGroupId, onClose, onSaved }) {
  const [form, setForm] = useState({ category: 'groceries', amount: '', label: '', note: '', date: format(new Date(), 'yyyy-MM-dd'), entry_type: 'expense' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    await SDK.entities.FamilyBudget.create({
      family_group_id: familyGroupId,
      month,
      category: form.category,
      amount: parseFloat(form.amount),
      label: form.label,
      note: form.note,
      date: form.date,
      entry_type: form.entry_type,
      logged_by_email: user?.email,
      logged_by_name: user?.full_name,
      currency: 'GBP',
    });
    setSaving(false);
    toast.success(form.entry_type === 'limit' ? 'Budget limit set!' : 'Expense logged!');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-[#0a1f44] border border-white/15 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
        <h3 className="text-base font-black text-white">
          {form.entry_type === 'limit' ? '🎯 Set Budget Limit' : '➕ Log Expense'}
        </h3>

        {/* Type toggle */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5">
          {['expense', 'limit'].map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, entry_type: t }))}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold transition-all',
                form.entry_type === t ? 'bg-[#E8B84B] text-[#071224]' : 'text-white/40 hover:text-white')}>
              {t === 'expense' ? '💸 Expense' : '🎯 Set Limit'}
            </button>
          ))}
        </div>

        {/* Category */}
        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1.5 block">Category</label>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))}
                className={cn('flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all',
                  form.category === c.key
                    ? 'border-[#E8B84B]/50 bg-[#E8B84B]/10 scale-105'
                    : 'border-white/8 bg-white/3 hover:border-white/15')}>
                <span className="text-sm">{c.emoji}</span>
                <span className="text-[8px] text-white/50 font-semibold leading-tight mt-0.5">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 block">Amount (£)</label>
            <Input type="number" placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="bg-white/5 border-white/15 text-white" />
          </div>
          {form.entry_type === 'expense' && (
            <div>
              <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 block">Date</label>
              <Input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="bg-white/5 border-white/15 text-white" />
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1 block">Label (optional)</label>
          <Input placeholder="e.g. Tesco weekly shop" value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="bg-white/5 border-white/15 text-white" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={onClose} variant="outline" className="flex-1 border-white/15 text-white/50 bg-transparent">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#E8B84B] text-[#071224] font-bold hover:opacity-90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function FamilyBudgetPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const qc = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => SDK.auth.me() });

  const { data: groups = [] } = useQuery({
    queryKey: ['familyGroups'],
    queryFn: () => SDK.entities.FamilyGroup.list(),
  });
  const group = groups.find(g => g.member_emails?.includes(user?.email)) || groups[0];

  const month = monthStr(currentMonth);

  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['familyBudget', group?.id],
    queryFn: () => group?.id ? SDK.entities.FamilyBudget.filter({ family_group_id: group.id }) : [],
    enabled: !!group?.id,
  });

  const monthExpenses = allEntries.filter(e => e.entry_type === 'expense' && e.month === month);
  const monthLimits   = allEntries.filter(e => e.entry_type === 'limit'   && e.month === month);

  const limitsMap = useMemo(() => {
    const m = {};
    for (const l of monthLimits) m[l.category] = l.amount;
    return m;
  }, [monthLimits]);

  const spendMap = useMemo(() => {
    const m = {};
    for (const e of monthExpenses) m[e.category] = (m[e.category] || 0) + (e.amount || 0);
    return m;
  }, [monthExpenses]);

  const totalSpent = Object.values(spendMap).reduce((a, b) => a + b, 0);
  const totalLimit = Object.values(limitsMap).reduce((a, b) => a + b, 0);

  const chartData = CATEGORIES
    .filter(c => spendMap[c.key] || limitsMap[c.key])
    .map(c => ({
      name: `${c.emoji} ${c.label}`,
      spent: spendMap[c.key] || 0,
      limit: limitsMap[c.key] || 0,
      color: c.color,
    }));

  const handleAnalyze = async () => {
    if (!group?.id) { toast.error('No family group found'); return; }
    setAnalyzing(true);
    setAnalysisData(null);
    try {
      const res = await SDK.functions.invoke('analyzeFamilyBudget', {
        family_group_id: group.id,
        month,
      });
      setAnalysisData(res.data);
    } catch { toast.error('Analysis failed. Please try again.'); }
    setAnalyzing(false);
  };

  const handleDelete = async (id) => {
    await SDK.entities.FamilyBudget.delete(id);
    qc.invalidateQueries(['familyBudget', group?.id]);
    toast.success('Removed');
  };

  const navigateMonth = (dir) => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'next' ? 1 : -1));
      return d;
    });
    setAnalysisData(null);
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-white/40 text-lg">No family group found.</p>
          <p className="text-white/25 text-sm mt-2">Create a family group in the Family Hub first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-5 space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a4a6e] via-[#1a7ab8] to-[#3ecfa0] p-5 shadow-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12 pointer-events-none" />
          <div className="relative">
            <p className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-1">Family Budget</p>
            <h1 className="text-2xl font-black text-white mb-3">Smart Spending Tracker</h1>

            {/* Month nav */}
            <div className="flex items-center justify-between bg-white/10 rounded-2xl px-3 py-2">
              <button onClick={() => navigateMonth('prev')} className="p-1.5 text-white/60 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-white">{format(currentMonth, 'MMMM yyyy')}</span>
              <button onClick={() => navigateMonth('next')} className="p-1.5 text-white/60 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[
                { label: 'Spent', value: `£${totalSpent.toFixed(0)}`, color: 'text-white' },
                { label: 'Budget', value: totalLimit > 0 ? `£${totalLimit.toFixed(0)}` : '—', color: 'text-teal-200' },
                { label: 'Remaining', value: totalLimit > 0 ? `£${(totalLimit - totalSpent).toFixed(0)}` : '—', color: totalLimit > 0 && totalSpent > totalLimit ? 'text-red-300' : 'text-green-300' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-white/40 font-semibold uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={() => setShowAdd(true)}
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-bold gap-2">
            <PlusCircle className="w-4 h-4" /> Add Expense / Limit
          </Button>
          <Button onClick={handleAnalyze} disabled={analyzing || monthExpenses.length === 0}
            variant="outline"
            className="flex-1 border-purple-400/30 text-purple-400 hover:bg-purple-400/10 bg-transparent gap-2">
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Analysis
          </Button>
        </div>

        {/* AI Analysis results */}
        <AnimatePresence>
          {analysisData && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-purple-500/8 border border-purple-400/20 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-black text-white">AI Spending Analysis</h3>
                {analysisData.analysis?.health_score && (
                  <div className="ml-auto flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-black text-white">{analysisData.analysis.health_score}/10</span>
                  </div>
                )}
              </div>

              {analysisData.analysis?.health_summary && (
                <p className="text-xs text-white/60 leading-relaxed">{analysisData.analysis.health_summary}</p>
              )}

              {/* Saving opportunities */}
              {analysisData.analysis?.savings_opportunities?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">💡 Where to Save</p>
                  {analysisData.analysis.savings_opportunities.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-2xl">
                      <TrendingDown className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-teal-300">{s.category} · Save ~{s.estimated_saving}</p>
                        <p className="text-xs text-white/50 mt-0.5">{s.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Positive habits */}
              {analysisData.analysis?.positive_habits?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">✅ Good Habits</p>
                  {analysisData.analysis.positive_habits.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {h}
                    </div>
                  ))}
                </div>
              )}

              {/* Islamic tip */}
              {analysisData.analysis?.islamic_tip && (
                <div className="flex gap-2 p-3 bg-[#E8B84B]/8 border border-[#E8B84B]/15 rounded-2xl">
                  <span className="text-base flex-shrink-0">🤲</span>
                  <p className="text-xs text-[#E8B84B]/80 leading-relaxed">{analysisData.analysis.islamic_tip}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-4">
            <p className="text-xs font-black text-white/50 uppercase tracking-widest mb-3">Spend vs. Budget by Category</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0a1f44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  labelStyle={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}
                  itemStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                  formatter={(v) => [`£${v.toFixed(2)}`]}
                />
                <Bar dataKey="spent" name="Spent" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
                <Bar dataKey="limit" name="Limit" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Category breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-black text-white/40 uppercase tracking-widest px-1">Category Breakdown</p>
          {CATEGORIES.filter(c => spendMap[c.key] || limitsMap[c.key]).map(cat => {
            const spent = spendMap[cat.key] || 0;
            const limit = limitsMap[cat.key] || 0;
            const pct   = limit > 0 ? Math.min((spent / limit) * 100, 100) : null;
            const over  = limit > 0 && spent > limit;

            return (
              <div key={cat.key} className="bg-white/[0.03] border border-white/8 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.emoji}</span>
                    <span className="text-sm font-bold text-white">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-black', over ? 'text-red-400' : 'text-white')}>
                      £{spent.toFixed(2)}
                    </span>
                    {limit > 0 && <span className="text-xs text-white/30">/ £{limit.toFixed(2)}</span>}
                    {over && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', over ? 'bg-red-400' : 'bg-teal-400')}
                      style={{ width: `${pct}%`, backgroundColor: over ? '#f87171' : cat.color }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent expenses */}
        {monthExpenses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black text-white/40 uppercase tracking-widest px-1">Recent Expenses</p>
            {[...monthExpenses].sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date)).slice(0, 20).map(e => {
              const cat = getCat(e.category);
              return (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/8 rounded-2xl group">
                  <span className="text-base flex-shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-semibold leading-tight">{e.label || cat.label}</p>
                    <p className="text-[10px] text-white/30">
                      {e.logged_by_name || 'You'} · {e.date ? format(new Date(e.date), 'd MMM') : ''}
                    </p>
                  </div>
                  <span className="text-sm font-black text-white">£{(e.amount || 0).toFixed(2)}</span>
                  <button onClick={() => handleDelete(e.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {monthExpenses.length === 0 && !isLoading && (
          <div className="text-center py-14 bg-white/[0.02] border border-white/8 rounded-3xl">
            <DollarSign className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/40 font-semibold">No expenses logged for {format(currentMonth, 'MMMM yyyy')}</p>
            <p className="text-white/25 text-sm mt-1">Tap "Add Expense / Limit" to start tracking.</p>
          </div>
        )}
      </div>

      {showAdd && (
        <AddEntryModal
          month={month}
          user={user}
          familyGroupId={group?.id}
          onClose={() => setShowAdd(false)}
          onSaved={() => qc.invalidateQueries(['familyBudget', group?.id])}
        />
      )}
    </div>
  );
}
/**
 * FamilyHajjSavings — visual Hajj savings goal tracker for Family Hub.
 * Shows group target, per-member contributions, and progress bar.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Target, Plus, TrendingUp, Users, Calendar, Edit2, Check, X, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const CURRENCIES = ['USD', 'GBP', 'EUR', 'SAR', 'AED', 'PKR', 'BDT'];

function MemberBar({ name, amount, total, currency }) {
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
  const colors = ['bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-sky-500'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[60%]">{name}</span>
        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
          {currency} {amount.toLocaleString()} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)} />
      </div>
    </div>
  );
}

export default function FamilyHajjSavings({ group, user }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(group.hajj_budget_saved ? 'USD' : 'USD');
  const [notes, setNotes] = useState('');
  const [goalTarget, setGoalTarget] = useState(group.hajj_budget_target || '');
  const [goalYear, setGoalYear] = useState(group.hajj_target_year || '');
  const [goalCurrency, setGoalCurrency] = useState('USD');

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['familyContributions', group.id],
    queryFn: () => base44.entities.FamilyContribution.filter({ family_group_id: group.id, type: 'hajj_savings' }, '-date', 100),
  });

  const addMutation = useMutation({
    mutationFn: () => base44.entities.FamilyContribution.create({
      family_group_id: group.id,
      contributor_email: user.email,
      contributor_name: user.full_name || user.email.split('@')[0],
      type: 'hajj_savings',
      amount: parseFloat(amount),
      currency,
      notes,
      date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyContributions', group.id] });
      setAmount(''); setNotes(''); setShowAddForm(false);
      toast.success('Contribution recorded! 🕋');
    },
    onError: () => toast.error('Failed to save contribution'),
  });

  const saveGoalMutation = useMutation({
    mutationFn: () => base44.entities.FamilyGroup.update(group.id, {
      hajj_budget_target: parseFloat(goalTarget),
      hajj_target_year: goalYear,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyGroup'] });
      setShowGoalForm(false);
      toast.success('Goal updated!');
    },
    onError: () => toast.error('Failed to update goal'),
  });

  // Aggregate per-member
  const memberTotals = contributions.reduce((acc, c) => {
    acc[c.contributor_name || c.contributor_email] = (acc[c.contributor_name || c.contributor_email] || 0) + (c.amount || 0);
    return acc;
  }, {});

  const totalSaved = Object.values(memberTotals).reduce((s, v) => s + v, 0);
  const target = parseFloat(group.hajj_budget_target) || 0;
  const pct = target > 0 ? Math.min((totalSaved / target) * 100, 100) : 0;
  const remaining = Math.max(target - totalSaved, 0);
  const displayCurrency = contributions[0]?.currency || goalCurrency || 'USD';

  const milestones = [25, 50, 75, 100];

  return (
    <div className="space-y-5">

      {/* Goal card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 p-5 text-white shadow-lg">
        <div className="absolute top-0 right-0 text-[80px] leading-none font-black opacity-10 select-none">🕋</div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-rose-200 font-medium uppercase tracking-widest mb-0.5">Hajj Savings Goal</p>
              <h2 className="text-2xl font-black">
                {target > 0 ? `${displayCurrency} ${target.toLocaleString()}` : 'Set a goal'}
              </h2>
              {group.hajj_target_year && (
                <p className="text-xs text-rose-200 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Target year: {group.hajj_target_year}
                </p>
              )}
            </div>
            <button onClick={() => setShowGoalForm(g => !g)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Edit goal inline */}
          {showGoalForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-3 space-y-2">
              <div className="flex gap-2">
                <select value={goalCurrency} onChange={e => setGoalCurrency(e.target.value)}
                  className="bg-white/20 text-white text-xs rounded-lg px-2 py-1.5 outline-none border border-white/30 w-20">
                  {CURRENCIES.map(c => <option key={c} value={c} className="text-slate-800">{c}</option>)}
                </select>
                <input type="number" placeholder="Target amount" value={goalTarget} onChange={e => setGoalTarget(e.target.value)}
                  className="flex-1 bg-white/20 text-white placeholder-white/60 text-sm rounded-lg px-3 py-1.5 outline-none border border-white/30" />
                <input type="text" placeholder="Year e.g. 2027" value={goalYear} onChange={e => setGoalYear(e.target.value)}
                  className="w-24 bg-white/20 text-white placeholder-white/60 text-sm rounded-lg px-3 py-1.5 outline-none border border-white/30" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveGoalMutation.mutate()} disabled={!goalTarget || saveGoalMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 bg-white text-rose-600 font-bold text-xs py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                  {saveGoalMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                </button>
                <button onClick={() => setShowGoalForm(false)} className="px-3 bg-white/20 rounded-lg text-xs"><X className="w-3 h-3" /></button>
              </div>
            </motion.div>
          )}

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-rose-100">
              <span>{displayCurrency} {totalSaved.toLocaleString()} saved</span>
              <span>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden relative">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-white rounded-full" />
              {milestones.map(m => (
                <div key={m} style={{ left: `${m}%` }} className="absolute top-0 bottom-0 w-px bg-rose-400/40" />
              ))}
            </div>
            {target > 0 && remaining > 0 && (
              <p className="text-xs text-rose-200">{displayCurrency} {remaining.toLocaleString()} remaining</p>
            )}
            {pct >= 100 && (
              <p className="text-xs font-bold text-white animate-pulse">🎉 Goal reached! May Allah accept your Hajj.</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Saved', value: `${displayCurrency} ${totalSaved.toLocaleString()}`, icon: TrendingUp, color: 'text-teal-600' },
          { label: 'Contributors', value: Object.keys(memberTotals).length, icon: Users, color: 'text-indigo-600' },
          { label: 'Contributions', value: contributions.length, icon: DollarSign, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800/60 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/60 shadow-sm">
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
            <p className="text-base font-black text-slate-800 dark:text-slate-100">{s.value}</p>
            <p className="text-[10px] text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-member breakdown */}
      {Object.keys(memberTotals).length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Member Contributions</p>
          {Object.entries(memberTotals)
            .sort(([, a], [, b]) => b - a)
            .map(([name, amt]) => (
              <MemberBar key={name} name={name} amount={amt} total={totalSaved} currency={displayCurrency} />
            ))}
        </div>
      )}

      {/* Recent contributions */}
      {contributions.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Entries</p>
          <div className="space-y-2">
            {contributions.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-rose-600">{(c.contributor_name || c.contributor_email).charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.contributor_name || c.contributor_email.split('@')[0]}</p>
                  {c.notes && <p className="text-xs text-slate-400 truncate">{c.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-teal-600">+{c.currency} {(c.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">{c.date ? format(new Date(c.date), 'MMM d') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add contribution */}
      {showAddForm ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 shadow-sm space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Log Your Contribution</p>
          <div className="flex gap-2">
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="bg-slate-100 dark:bg-slate-700 rounded-xl px-2 py-2.5 text-sm outline-none w-20 text-slate-700 dark:text-slate-200">
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400" />
          </div>
          <input type="text" placeholder="Note (optional)" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400" />
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">Cancel</button>
            <Button onClick={() => addMutation.mutate()} disabled={!amount || addMutation.isPending} className="flex-1 bg-rose-500 hover:bg-rose-600 h-10">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Contribution'}
            </Button>
          </div>
        </motion.div>
      ) : (
        <Button onClick={() => setShowAddForm(true)} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90 h-11 font-bold shadow-md shadow-rose-200/40">
          <Plus className="w-4 h-4 mr-2" /> Log Hajj Savings Contribution
        </Button>
      )}
    </div>
  );
}
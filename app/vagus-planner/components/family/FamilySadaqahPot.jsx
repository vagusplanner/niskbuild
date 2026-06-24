import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Heart, Target, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CAUSES = ['General Sadaqah', 'Gaza Relief', 'Orphan Sponsorship', 'Food Bank', 'Zakat', 'Masjid Fund', 'Education', 'Water Well'];
const CURRENCIES = ['GBP', 'USD', 'EUR', 'AED', 'SAR'];

export default function FamilySadaqahPot({ groupId, user }) {
  const [amount, setAmount] = useState('');
  const [cause, setCause] = useState('General Sadaqah');
  const [notes, setNotes] = useState('');
  const [contribType, setContribType] = useState('sadaqah');
  const [currency, setCurrency] = useState('GBP');
  const [monthlyGoal, setMonthlyGoal] = useState(200);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const qc = useQueryClient();

  const { data: contributions = [] } = useQuery({
    queryKey: ['familyContributions', groupId],
    queryFn: () => base44.entities.FamilyContribution.filter({ family_group_id: groupId }),
    enabled: !!groupId,
  });

  const addContrib = useMutation({
    mutationFn: (data) => base44.entities.FamilyContribution.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['familyContributions', groupId]);
      toast.success('🤲 JazakAllah Khair! Contribution added.');
      setAmount(''); setNotes('');
    },
  });

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyContribs = contributions.filter(c => c.date?.startsWith(thisMonth));
  const monthlyTotal = monthlyContribs.reduce((s, c) => s + (c.amount || 0), 0);
  const allTimeTotal = contributions.reduce((s, c) => s + (c.amount || 0), 0);
  const progressPct = Math.min((monthlyTotal / monthlyGoal) * 100, 100);

  // Per-member leaderboard
  const leaderboard = Object.entries(
    contributions.reduce((acc, c) => {
      const key = c.contributor_email || 'unknown';
      acc[key] = { name: c.contributor_name || key, total: (acc[key]?.total || 0) + (c.amount || 0) };
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n || 0);

  const handleAdd = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return toast.error('Enter a valid amount');
    addContrib.mutate({
      family_group_id: groupId,
      contributor_email: user?.email,
      contributor_name: user?.full_name || user?.email,
      type: contribType,
      amount: val,
      currency,
      charity_name: cause,
      date: new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
      verified: false,
    });
  };

  return (
    <div className="space-y-5">
      {/* The Jar visualization */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-900/30 to-pink-900/20 border border-rose-400/25 p-6">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🫙</div>
          <h3 className="text-xl font-black text-white">Family Sadaqah Jar</h3>
          <p className="text-white/50 text-xs">This month's collective giving goal</p>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span className="font-bold text-rose-300">{fmt(monthlyTotal)} raised</span>
            <span>Goal: {fmt(monthlyGoal)}</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 relative">
              {progressPct > 10 && (
                <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white">
                  {Math.round(progressPct)}%
                </div>
              )}
            </motion.div>
          </div>
          {progressPct >= 100 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-amber-400 font-bold mt-2">
              🎉 MashaAllah! Monthly goal reached!
            </motion.p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 rounded-2xl p-3">
            <p className="text-base font-black text-rose-300">{fmt(monthlyTotal)}</p>
            <p className="text-[10px] text-white/40">This Month</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <p className="text-base font-black text-amber-300">{fmt(allTimeTotal)}</p>
            <p className="text-[10px] text-white/40">All Time</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 cursor-pointer" onClick={() => { setEditingGoal(true); setGoalInput(monthlyGoal); }}>
            <p className="text-base font-black text-teal-300">{fmt(monthlyGoal)}</p>
            <p className="text-[10px] text-white/40">Monthly Goal ✏️</p>
          </div>
        </div>

        {editingGoal && (
          <div className="flex gap-2 mt-3">
            <Input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
              className="bg-white/10 border-white/20 text-white" placeholder="Monthly goal" />
            <Button onClick={() => { setMonthlyGoal(parseFloat(goalInput) || 200); setEditingGoal(false); }}
              className="bg-amber-400 text-[#071224] font-bold flex-shrink-0">Set</Button>
          </div>
        )}
      </div>

      {/* Add contribution */}
      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2"><Plus className="w-4 h-4 text-rose-400" /> Add Contribution</h3>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase mb-1 block">Type</label>
            <select value={contribType} onChange={e => setContribType(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
              <option value="sadaqah" className="bg-[#071224]">Sadaqah</option>
              <option value="zakat" className="bg-[#071224]">Zakat</option>
              <option value="charity" className="bg-[#071224]">Charity</option>
              <option value="hajj_savings" className="bg-[#071224]">Hajj Savings</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-white/40 font-bold uppercase mb-1 block">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
              {CURRENCIES.map(c => <option key={c} value={c} className="bg-[#071224]">{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-white/40 font-bold uppercase mb-1 block">Cause / Charity</label>
          <select value={cause} onChange={e => setCause(e.target.value)}
            className="w-full bg-white/5 border border-white/15 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            {CAUSES.map(c => <option key={c} value={c} className="bg-[#071224]">{c}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 flex-1" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (optional)"
            className="bg-white/5 border-white/20 text-white placeholder:text-white/30 flex-1" />
        </div>

        <Button onClick={handleAdd} disabled={addContrib.isPending} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold gap-2">
          <Heart className="w-4 h-4" /> Add to Family Jar
        </Button>
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-5 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Family Leaderboard</h3>
          <div className="space-y-2">
            {leaderboard.map(([email, { name, total }], i) => (
              <div key={email} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/8 rounded-2xl">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-[#071224]' : i === 1 ? 'bg-slate-400 text-[#071224]' : 'bg-amber-700/50 text-amber-200'}`}>
                  {i + 1}
                </div>
                <p className="flex-1 text-sm font-bold text-white truncate">{name}</p>
                <p className="text-sm font-black text-rose-300">{fmt(total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      {contributions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest px-1">Recent Contributions</p>
          {contributions.slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/6 rounded-xl">
              <Heart className="w-4 h-4 text-rose-400/60 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/80 truncate">{c.contributor_name} → {c.charity_name}</p>
                <p className="text-[10px] text-white/30">{c.date} · {c.type}</p>
              </div>
              <p className="text-sm font-black text-rose-300 flex-shrink-0">{new Intl.NumberFormat('en-GB', { style: 'currency', currency: c.currency || 'GBP', maximumFractionDigits: 2 }).format(c.amount || 0)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
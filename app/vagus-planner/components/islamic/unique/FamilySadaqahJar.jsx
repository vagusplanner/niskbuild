import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, Plus, Target, TrendingUp, Users, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MONTHLY_GOAL = 200; // USD default

export default function FamilySadaqahJar() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ amount: '', charity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: families = [] } = useQuery({
    queryKey: ['familyGroups'],
    queryFn: () => base44.entities.FamilyGroup.filter({ member_emails: { $contains: '' } }, '-created_date', 1).catch(() => []),
  });
  const family = families[0];

  const { data: contributions = [], isLoading } = useQuery({
    queryKey: ['sadaqahContributions', family?.id],
    queryFn: () => family
      ? base44.entities.FamilyContribution.filter({ family_group_id: family.id, type: 'sadaqah' }, '-date', 50)
      : base44.entities.CharityDonation.list('-date', 30),
    enabled: true,
  });

  // This month total
  const currentMonth = format(new Date(), 'yyyy-MM');
  const thisMonthTotal = contributions
    .filter(c => (c.date || c.created_date || '').startsWith(currentMonth))
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const allTimeTotal = contributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const progressPct = Math.min((thisMonthTotal / MONTHLY_GOAL) * 100, 100);

  // Group by contributor
  const byContributor = {};
  contributions.forEach(c => {
    const name = c.contributor_name || c.created_by || 'You';
    byContributor[name] = (byContributor[name] || 0) + (Number(c.amount) || 0);
  });

  const contribute = async () => {
    if (!form.amount || isNaN(Number(form.amount))) return toast.error('Enter a valid amount');
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        currency: 'USD',
        charity_name: form.charity || 'General Sadaqah',
        type: 'sadaqah',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: form.notes,
        status: 'active',
      };

      if (family) {
        await base44.entities.FamilyContribution.create({
          ...payload,
          family_group_id: family.id,
          contributor_email: user?.email,
          contributor_name: user?.full_name || user?.email,
        });
      } else {
        await base44.entities.CharityDonation.create(payload);
      }

      qc.invalidateQueries(['sadaqahContributions']);
      toast.success(`🤲 JazakAllah Khair! $${form.amount} added to the Sadaqah Jar.`);
      setForm({ amount: '', charity: '', notes: '' });
      setShowAdd(false);

      // Celebrate if goal reached
      if (thisMonthTotal + Number(form.amount) >= MONTHLY_GOAL) {
        setTimeout(() => toast.success('🎉 MashaAllah! Monthly Sadaqah goal reached!'), 500);
      }
    } catch (_) { toast.error('Failed to save contribution.'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          <h3 className="font-black text-slate-800 dark:text-slate-100">
            {family ? `${family.name} Sadaqah Jar` : 'My Sadaqah Jar'}
          </h3>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-rose-500 hover:bg-rose-600 text-white h-8">
          <Plus className="w-3.5 h-3.5 mr-1" /> Give
        </Button>
      </div>

      {/* Jar visualization */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">${thisMonthTotal.toFixed(0)}</p>
            <p className="text-xs text-rose-500/70 dark:text-rose-400/70">of ${MONTHLY_GOAL} this month</p>
          </div>
          <div className="text-5xl">🫙</div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-rose-500 mb-1.5">
            <span>Monthly Goal Progress</span>
            <span className="font-black">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-4 bg-rose-100 dark:bg-rose-900/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full relative"
            >
              {progressPct >= 20 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white text-[9px] font-black">{Math.round(progressPct)}%</span>
              )}
            </motion.div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-center">
          <div className="flex-1">
            <p className="text-lg font-black text-slate-700 dark:text-slate-200">${allTimeTotal.toFixed(0)}</p>
            <p className="text-[10px] text-slate-400">All Time</p>
          </div>
          <div className="w-px h-8 bg-rose-200 dark:bg-rose-800/40" />
          <div className="flex-1">
            <p className="text-lg font-black text-slate-700 dark:text-slate-200">{contributions.length}</p>
            <p className="text-[10px] text-slate-400">Contributions</p>
          </div>
          <div className="w-px h-8 bg-rose-200 dark:bg-rose-800/40" />
          <div className="flex-1">
            <p className="text-lg font-black text-slate-700 dark:text-slate-200">{Object.keys(byContributor).length}</p>
            <p className="text-[10px] text-slate-400">Contributors</p>
          </div>
        </div>
      </div>

      {/* Add contribution */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1 block">Amount (USD)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1 block">Charity / Cause</label>
              <input value={form.charity} onChange={e => setForm(f=>({...f,charity:e.target.value}))}
                placeholder="e.g. Local mosque"
                className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
          </div>
          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 20, 50].map(a => (
              <button key={a} onClick={() => setForm(f=>({...f,amount:String(a)}))}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${form.amount === String(a) ? 'bg-rose-500 text-white border-rose-500' : 'border-rose-200 text-rose-600 hover:bg-rose-50'}`}>
                ${a}
              </button>
            ))}
          </div>
          <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Intention / notes (optional)" rows={2}
            className="w-full px-3 py-2 text-sm rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <Button onClick={contribute} disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '🤲 Add to Jar'}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      {Object.keys(byContributor).length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Contributors
          </p>
          <div className="space-y-1.5">
            {Object.entries(byContributor).sort((a,b) => b[1]-a[1]).map(([name, amt], i) => (
              <div key={name} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-sm font-black text-slate-400 w-5">{i+1}</span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{name}</span>
                <span className="text-sm font-black text-rose-500">${amt.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
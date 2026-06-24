/**
 * FamilyZakatLedger — unified family Zakat, Sadaqah & charity contribution ledger.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Loader2, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { GA } from '@/lib/ga4';
import { LoadingRows, ErrorState, EmptyState } from '@/components/family/FamilyErrorState';
import { cn } from '@/lib/utils';

const TYPE_COLORS = {
  zakat: 'bg-amber-100 text-amber-700',
  sadaqah: 'bg-emerald-100 text-emerald-700',
  hajj_savings: 'bg-rose-100 text-rose-700',
  charity: 'bg-blue-100 text-blue-700',
};

const TYPE_LABELS = { zakat: 'Zakat', sadaqah: 'Sadaqah', hajj_savings: 'Hajj Savings', charity: 'Charity' };

export default function FamilyZakatLedger({ group, user }) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ type: 'sadaqah', amount: '', charity_name: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: contributions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['familyContributions', group.id],
    queryFn: () => SDK.entities.FamilyContribution.filter({ family_group_id: group.id }),
  });

  const addMutation = useMutation({
    mutationFn: () => SDK.entities.FamilyContribution.create({
      family_group_id: group.id,
      contributor_email: user.email,
      contributor_name: user.full_name || user.email,
      type: form.type,
      amount: parseFloat(form.amount),
      charity_name: form.charity_name,
      notes: form.notes,
      date: format(new Date(), 'yyyy-MM-dd'),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyContributions'] });
      GA.familyContributionLogged(form.type, parseFloat(form.amount));
      toast.success('Contribution logged! May Allah accept it 🤲');
      setShowForm(false);
      setForm({ type: 'sadaqah', amount: '', charity_name: '', notes: '' });
    },
  });

  const filtered = filterType === 'all' ? contributions : contributions.filter(c => c.type === filterType);

  // Totals by type
  const totals = contributions.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + (c.amount || 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  // Per-member totals
  const memberTotals = {};
  contributions.forEach(c => {
    memberTotals[c.contributor_name || c.contributor_email] = (memberTotals[c.contributor_name || c.contributor_email] || 0) + c.amount;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" /> Zakat & Charity Ledger
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)}
          className="bg-pink-500 hover:bg-pink-600 text-white text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> Log
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border border-pink-100 dark:border-pink-900/40 p-3 text-center">
          <p className="text-2xl font-black text-pink-600 dark:text-pink-400">${grandTotal.toLocaleString()}</p>
          <p className="text-[11px] text-pink-500 font-semibold">Family Total</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-3 text-center">
          <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{contributions.length}</p>
          <p className="text-[11px] text-slate-500 font-semibold">Contributions</p>
        </div>
      </div>

      {/* Per-member breakdown */}
      {Object.keys(memberTotals).length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">By Member</p>
          </div>
          <div className="space-y-2">
            {Object.entries(memberTotals).sort((a, b) => b[1] - a[1]).map(([name, total]) => {
              const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 dark:text-slate-400 w-24 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-pink-100 dark:bg-pink-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-pink-600 w-12 text-right">${total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap">
        {['all', 'zakat', 'sadaqah', 'hajj_savings', 'charity'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn('px-3 py-1 text-xs rounded-full border font-semibold transition-all capitalize',
              filterType === t ? 'bg-pink-500 text-white border-pink-500' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400 hover:border-pink-300'
            )}>
            {t === 'all' ? 'All' : TYPE_LABELS[t]}
            {t !== 'all' && totals[t] ? ` $${(totals[t] || 0).toLocaleString()}` : ''}
          </button>
        ))}
      </div>

      {/* Contribution list */}
      {isLoading ? <LoadingRows count={3} /> : isError ? <ErrorState onRetry={refetch} /> : filtered.length === 0 ? (
        <EmptyState icon={Heart} title="No contributions yet" subtitle="Log your family's Zakat, Sadaqah and charity donations here." />
      ) : (
        <div className="space-y-2">
          {filtered.slice().sort((a, b) => b.date?.localeCompare(a.date)).map(c => (
            <div key={c.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', TYPE_COLORS[c.type] || 'bg-slate-100')}>
                <Heart className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {c.charity_name || TYPE_LABELS[c.type]} · {c.contributor_name}
                </p>
                <p className="text-xs text-slate-400">{c.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-black text-sm text-pink-600 dark:text-pink-400">${c.amount?.toLocaleString()}</p>
                <Badge className={`${TYPE_COLORS[c.type] || ''} border-0 text-[10px]`}>{TYPE_LABELS[c.type]}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-pink-500" />Log Contribution</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zakat">Zakat</SelectItem>
                    <SelectItem value="sadaqah">Sadaqah</SelectItem>
                    <SelectItem value="hajj_savings">Hajj Savings</SelectItem>
                    <SelectItem value="charity">Charity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" className="mt-1" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Charity / Cause</Label>
              <Input className="mt-1" placeholder="e.g. Islamic Relief" value={form.charity_name}
                onChange={e => setForm(f => ({ ...f, charity_name: e.target.value }))} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input className="mt-1" placeholder="Any notes..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.amount || addMutation.isPending}
                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white">
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log 🤲'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
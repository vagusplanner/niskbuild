import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SDK } from '@/lib/custom-sdk.js';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Droplets, Plus, AlertCircle, CheckCircle2, Moon } from 'lucide-react';
import { toast } from 'sonner';

export default function HaydTracker() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '', flow: 'medium', notes: '' });
  const queryClient = useQueryClient();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => SDK.entities.Period.list('-start_date', 12),
  });

  const addMutation = useMutation({
    mutationFn: (data) => SDK.entities.Period.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      setShowAdd(false);
      toast.success('Period logged');
    },
  });

  const today = new Date();
  const latest = periods[0];

  // Determine current state
  let status = 'pure'; // pure | hayd | estimated
  let purityDays = 0;
  let nextEstimate = null;

  if (latest) {
    const endDate = latest.end_date ? parseISO(latest.end_date) : null;
    const startDate = parseISO(latest.start_date);
    const cycleLen = latest.cycle_length || 28;

    if (!endDate || today <= endDate) {
      status = 'hayd';
    } else {
      purityDays = differenceInDays(today, endDate);
      const nextStart = addDays(startDate, cycleLen);
      nextEstimate = nextStart;
      const daysUntil = differenceInDays(nextStart, today);
      if (daysUntil <= 3 && daysUntil >= 0) status = 'estimated';
    }
  }

  // Prayer obligations based on status
  const prayerStatus = status === 'hayd'
    ? { label: 'Prayers suspended', color: 'text-red-600', icon: '🚫' }
    : { label: 'Prayers obligatory', color: 'text-emerald-600', icon: '✅' };

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-2xl p-4 border ${
        status === 'hayd'
          ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
          : status === 'estimated'
          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
          : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className={`w-5 h-5 ${status === 'hayd' ? 'text-rose-500' : status === 'estimated' ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Hayd & Purity Tracker</span>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="h-8 bg-rose-500 hover:bg-rose-600 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Log
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/70 dark:bg-white/5 p-3 text-center">
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {status === 'hayd' ? '🩸' : status === 'estimated' ? '⚠️' : '✨'}
            </p>
            <p className="text-xs font-bold mt-1 capitalize text-slate-700 dark:text-slate-300">
              {status === 'hayd' ? 'Hayd Period' : status === 'estimated' ? 'Period Soon' : 'Tahara (Pure)'}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 dark:bg-white/5 p-3 text-center">
            <p className={`text-xs font-bold ${prayerStatus.color}`}>{prayerStatus.icon}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{prayerStatus.label}</p>
          </div>
        </div>

        {status === 'pure' && purityDays > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 text-center">
            Day {purityDays} of purity
            {nextEstimate && ` · Next period ~${format(nextEstimate, 'MMM d')}`}
          </p>
        )}
        {status === 'estimated' && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Next period expected in {differenceInDays(nextEstimate, today)} day(s)
          </p>
        )}
      </div>

      {/* History */}
      {periods.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recent History</p>
          {periods.slice(0, 4).map(p => {
            const duration = p.end_date
              ? differenceInDays(parseISO(p.end_date), parseISO(p.start_date)) + 1
              : null;
            return (
              <div key={p.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                <div className="w-2 h-8 rounded-full bg-rose-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {format(parseISO(p.start_date), 'MMM d')}
                    {p.end_date && ` – ${format(parseISO(p.end_date), 'MMM d')}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {duration ? `${duration} days` : 'Ongoing'}
                    {p.flow && ` · ${p.flow} flow`}
                    {p.cycle_length && ` · Cycle: ${p.cycle_length}d`}
                  </p>
                </div>
                <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]" variant="outline">
                  {p.flow || 'logged'}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Log dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-rose-500" /> Log Period
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Date</label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">End Date (optional)</label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Flow Intensity</label>
              <div className="flex gap-2">
                {['light', 'medium', 'heavy'].map(f => (
                  <button
                    key={f}
                    onClick={() => setForm(p => ({ ...p, flow: f }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                      form.flow === f ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-600 hover:bg-rose-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <Button
              onClick={() => addMutation.mutate(form)}
              disabled={!form.start_date || addMutation.isPending}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white"
            >
              {addMutation.isPending ? 'Saving…' : 'Save Period'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
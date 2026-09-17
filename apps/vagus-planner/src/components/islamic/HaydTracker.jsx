import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Droplets, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = () => ({
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  flow: 'medium',
  notes: '',
  cycle_length: 28,
});

export default function HaydTracker() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const queryClient = useQueryClient();

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => base44.entities.Period.list('-start_date', 12),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing?.id) {
        return base44.entities.Period.update(editing.id, data);
      }
      return base44.entities.Period.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm());
      toast.success(editing ? 'Period updated' : 'Period logged');
    },
    onError: (err) => {
      toast.error(err?.message || 'Could not save period');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (period) => {
    setEditing(period);
    setForm({
      start_date: period.start_date
        ? String(period.start_date).slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd'),
      end_date: period.end_date ? String(period.end_date).slice(0, 10) : '',
      flow: period.flow || 'medium',
      notes: period.notes || '',
      cycle_length: period.cycle_length || 28,
    });
    setShowForm(true);
  };

  const today = new Date();
  const latest = periods[0];

  let status = 'pure';
  let purityDays = 0;
  let nextEstimate = null;

  if (latest) {
    const endDate = latest.end_date ? parseISO(String(latest.end_date).slice(0, 10)) : null;
    const startDate = parseISO(String(latest.start_date).slice(0, 10));
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

  const prayerStatus = status === 'hayd'
    ? { label: 'Prayers suspended', color: 'text-red-600', icon: '🚫' }
    : { label: 'Prayers obligatory', color: 'text-emerald-600', icon: '✅' };

  return (
    <div className="space-y-4">
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
          <Button size="sm" onClick={openCreate} className="h-8 bg-rose-500 hover:bg-rose-600 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Log
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Status</p>
            <p className={`text-sm font-bold ${prayerStatus.color}`}>
              {prayerStatus.icon} {prayerStatus.label}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              {status === 'hayd' ? 'In period' : status === 'estimated' ? 'Expected soon' : 'Purity days'}
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {status === 'hayd'
                ? 'Active'
                : status === 'estimated' && nextEstimate
                ? format(nextEstimate, 'MMM d')
                : `${purityDays}d`}
            </p>
          </div>
        </div>
      </div>

      {periods.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recent entries</p>
          {periods.slice(0, 6).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openEdit(p)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {p.start_date ? format(parseISO(String(p.start_date).slice(0, 10)), 'MMM d, yyyy') : 'Unknown start'}
                  {p.end_date ? ` – ${format(parseISO(String(p.end_date).slice(0, 10)), 'MMM d')}` : ''}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {[p.flow, p.cycle_length ? `${p.cycle_length}d cycle` : null, p.notes]
                    .filter(Boolean)
                    .join(' · ') || 'Tap to edit'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]" variant="outline">
                  {p.flow || 'logged'}
                </Badge>
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-rose-500" />
              {editing ? 'Edit Period' : 'Log Period'}
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
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Cycle length (days)</label>
              <Input
                type="number"
                min={15}
                max={60}
                value={form.cycle_length}
                onChange={e => setForm(f => ({ ...f, cycle_length: Number(e.target.value) || 28 }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Flow Intensity</label>
              <div className="flex gap-2">
                {['light', 'medium', 'heavy'].map(f => (
                  <button
                    key={f}
                    type="button"
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
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.start_date || saveMutation.isPending}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white"
            >
              {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Save Period'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

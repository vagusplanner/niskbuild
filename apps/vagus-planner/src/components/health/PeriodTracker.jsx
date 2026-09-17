import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Heart, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays, isWithinInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';

const emptyForm = () => ({
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  flow: 'medium',
  notes: '',
  cycle_length: 28,
});

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export default function PeriodTracker({ compact = false }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data: periods = [] } = useQuery({
    queryKey: ['periods'],
    queryFn: () => base44.entities.Period.list('-start_date', 50)
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

  const lastPeriod = periods[0];
  const avgCycleLength = periods.length > 1
    ? Math.round(periods.slice(0, 5).reduce((sum, p, i, arr) => {
        if (i === 0) return sum;
        return sum + differenceInDays(new Date(arr[i-1].start_date), new Date(p.start_date));
      }, 0) / Math.min(4, periods.length - 1))
    : 28;

  const nextPredicted = lastPeriod
    ? addDays(new Date(lastPeriod.start_date), avgCycleLength)
    : null;

  const daysUntilNext = nextPredicted
    ? differenceInDays(nextPredicted, new Date())
    : null;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), cycle_length: avgCycleLength || 28 });
    setShowForm(true);
  };

  const openEdit = (period) => {
    setEditing(period);
    setForm({
      start_date: toDateInput(period.start_date) || format(new Date(), 'yyyy-MM-dd'),
      end_date: toDateInput(period.end_date),
      flow: period.flow || 'medium',
      notes: period.notes || '',
      cycle_length: period.cycle_length || avgCycleLength || 28,
    });
    setShowForm(true);
  };

  const formDialog = (
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
            <Heart className="w-4 h-4 text-rose-500" />
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
            className="w-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            {saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Save Period'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (compact) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl p-4 border border-rose-200"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-medium text-rose-800">Period Tracker</span>
            </div>
            <Button
              size="sm"
              onClick={openCreate}
              className="h-7 text-xs bg-rose-600 hover:bg-rose-700"
            >
              Log Today
            </Button>
          </div>
          {nextPredicted && daysUntilNext !== null && (
            <div className="space-y-1">
              <p className="text-xs text-rose-600">Next period in:</p>
              <p className="text-2xl font-bold text-rose-800">{daysUntilNext} days</p>
              <p className="text-xs text-rose-500">{format(nextPredicted, 'MMM d, yyyy')}</p>
            </div>
          )}
        </motion.div>
        {formDialog}
      </>
    );
  }

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-semibold text-rose-900">Period Tracker</h3>
          </div>
          <Button
            size="sm"
            onClick={openCreate}
            disabled={saveMutation.isPending}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Log Period
          </Button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-white/60 rounded-lg">
            <p className="text-sm text-rose-600 mb-1">Cycle Length</p>
            <p className="text-xl font-bold text-rose-800">{avgCycleLength} days</p>
          </div>

          {nextPredicted && daysUntilNext !== null && (
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-sm text-rose-600 mb-1">Next Period</p>
              <p className="text-xl font-bold text-rose-800">
                {daysUntilNext > 0 ? `In ${daysUntilNext} days` : 'Today'}
              </p>
              <p className="text-xs text-rose-500 mt-1">{format(nextPredicted, 'MMMM d, yyyy')}</p>
            </div>
          )}

          {lastPeriod && (
            <div className="pt-3 border-t border-rose-200">
              <p className="text-xs text-rose-600">Last period started</p>
              <p className="text-sm font-medium text-rose-800">
                {format(new Date(lastPeriod.start_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {periods.length > 0 && (
            <div className="pt-3 border-t border-rose-200 space-y-2">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Recent entries</p>
              {periods.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openEdit(p)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/80 border border-rose-100 hover:border-rose-300 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-rose-900">
                      {p.start_date
                        ? format(parseISO(String(p.start_date).slice(0, 10)), 'MMM d, yyyy')
                        : 'Unknown start'}
                      {p.end_date
                        ? ` – ${format(parseISO(String(p.end_date).slice(0, 10)), 'MMM d')}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-rose-500 mt-0.5">
                      {[p.flow, p.cycle_length ? `${p.cycle_length}d cycle` : null, p.notes]
                        .filter(Boolean)
                        .join(' · ') || 'Tap to edit'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-50 text-rose-600 border-rose-200 text-[10px]" variant="outline">
                      {p.flow || 'logged'}
                    </Badge>
                    <Pencil className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
      {formDialog}
    </>
  );
}

export function isPeriodDay(date, periods) {
  return periods.some(period => {
    const start = new Date(period.start_date);
    const end = period.end_date ? new Date(period.end_date) : addDays(start, 5);
    return isWithinInterval(date, { start, end });
  });
}

export function getPredictedPeriodDays(periods) {
  if (periods.length === 0) return [];

  const lastPeriod = periods[0];
  const avgCycleLength = periods.length > 1
    ? Math.round(periods.slice(0, 5).reduce((sum, p, i, arr) => {
        if (i === 0) return sum;
        return sum + differenceInDays(new Date(arr[i-1].start_date), new Date(p.start_date));
      }, 0) / Math.min(4, periods.length - 1))
    : 28;

  const nextStart = addDays(new Date(lastPeriod.start_date), avgCycleLength);
  const predictedDays = [];

  for (let i = 0; i < 5; i++) {
    predictedDays.push(addDays(nextStart, i));
  }

  return predictedDays;
}

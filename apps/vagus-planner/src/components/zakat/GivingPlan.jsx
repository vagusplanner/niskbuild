/**
 * Giving Plan — merged Family Sadaqah Jar + Recurring Sadaqah.
 * Modes: one-time pot | recurring schedule.
 * Primary persistence is localStorage so the jar always reflects saves
 * (the old FamilySadaqahJar used invalidateQueries(['key']) which is invalid
 * in TanStack Query v5 and never refreshed the list after save).
 */
import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, addWeeks, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Heart, Plus, Loader2, Users, RefreshCw, Bell, PiggyBank, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { formatMoney } from '@/lib/zakat-engine';

const PLAN_KEY = 'vagus_giving_plan_v1';
const DEFAULT_GOAL = 200;

function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) {
      return {
        mode: 'pot',
        goal: DEFAULT_GOAL,
        currency: 'GBP',
        potEntries: [],
        recurring: null,
        reminders: [],
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      mode: 'pot',
      goal: DEFAULT_GOAL,
      currency: 'GBP',
      potEntries: [],
      recurring: null,
      reminders: [],
    };
  }
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export default function GivingPlan({ currency = 'GBP', fmt }) {
  const queryClient = useQueryClient();
  const money = fmt || ((n) => formatMoney(n, currency));
  const [plan, setPlan] = useState(loadPlan);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: '', cause: '', notes: '' });
  const [recurringForm, setRecurringForm] = useState({
    amount: plan.recurring?.amount ? String(plan.recurring.amount) : '5',
    interval: plan.recurring?.interval || 'week',
    cause: plan.recurring?.cause || 'General Sadaqah',
  });

  const persist = (next) => {
    const resolved = typeof next === 'function' ? next(plan) : next;
    setPlan(resolved);
    savePlan(resolved);
    return resolved;
  };

  const currentMonth = format(new Date(), 'yyyy-MM');
  const thisMonthTotal = useMemo(
    () => plan.potEntries
      .filter((e) => (e.date || '').startsWith(currentMonth))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [plan.potEntries, currentMonth],
  );
  const allTimeTotal = useMemo(
    () => plan.potEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [plan.potEntries],
  );
  const progressPct = Math.min((thisMonthTotal / (plan.goal || DEFAULT_GOAL)) * 100, 100);

  const byContributor = useMemo(() => {
    const map = {};
    plan.potEntries.forEach((e) => {
      const name = e.contributor || 'You';
      map[name] = (map[name] || 0) + (Number(e.amount) || 0);
    });
    return map;
  }, [plan.potEntries]);

  const addToPot = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    const entry = {
      id: `pot_${Date.now()}`,
      amount,
      cause: form.cause || 'General Sadaqah',
      notes: form.notes || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      contributor: 'You',
      mode: 'pot',
    };

    // Always persist locally first so the jar updates immediately.
    const next = persist({
      ...plan,
      mode: 'pot',
      potEntries: [entry, ...plan.potEntries],
    });

    // Best-effort remote mirror (do not block UI on failure).
    try {
      await base44.entities.Expense.create({
        date: entry.date,
        amount: entry.amount,
        type: 'sadaqa',
        category: 'charity',
        description: `Sadaqah pot — ${entry.cause}`,
        notes: entry.notes,
        is_sadaqa: true,
      });
      queryClient.invalidateQueries({ queryKey: ['expenses-zakat'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['giving-log'] });
    } catch {
      // Local jar still shows the entry.
    }

    toast.success(`Added ${money(amount)} to your giving pot`);
    setForm({ amount: '', cause: '', notes: '' });
    setShowAdd(false);
    if (thisMonthTotal + amount >= (next.goal || DEFAULT_GOAL)) {
      setTimeout(() => toast.success('Monthly giving goal reached'), 400);
    }
    setSaving(false);
  };

  const saveRecurring = () => {
    const amount = Number(recurringForm.amount);
    if (!amount || amount < 1) {
      toast.error('Minimum recurring amount is 1');
      return;
    }
    const nextDue = recurringForm.interval === 'day'
      ? format(addDays(new Date(), 1), 'yyyy-MM-dd')
      : format(addWeeks(new Date(), 1), 'yyyy-MM-dd');
    persist({
      ...plan,
      mode: 'recurring',
      recurring: {
        amount,
        interval: recurringForm.interval,
        cause: recurringForm.cause || 'General Sadaqah',
        nextDue,
        status: 'active',
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      },
    });
    toast.success('Recurring giving plan saved locally (Stripe auto-pay coming soon)');
  };

  const clearRecurring = () => {
    persist({ ...plan, recurring: null, mode: 'pot' });
    toast.success('Recurring plan cleared');
  };

  const setReminder = async (kind) => {
    const title = kind === 'zakat'
      ? 'Remind me to pay Zakat'
      : 'Remind me about recurring giving';
    const when = addWeeks(new Date(), 1);
    const reminder = {
      id: `rem_${Date.now()}`,
      kind,
      title,
      date: format(when, 'yyyy-MM-dd'),
    };
    persist({ ...plan, reminders: [reminder, ...(plan.reminders || [])].slice(0, 20) });
    try {
      await base44.entities.Event.create({
        title,
        description: 'Vagus Planner giving reminder',
        start_date: when.toISOString(),
        end_date: when.toISOString(),
        category: 'other',
        is_all_day: true,
        reminders: [{ minutes_before: 60, type: 'notification' }],
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Reminder added to your calendar');
    } catch {
      toast.success('Reminder saved in Giving Plan (calendar sync unavailable)');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> Giving Plan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            One feature, two modes — a one-time pot or a recurring schedule. Same log, different cadence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => persist({ ...plan, mode: 'pot' })}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold ${
            plan.mode === 'pot'
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700'
              : 'border-slate-200 dark:border-slate-700 text-slate-600'
          }`}
        >
          <PiggyBank className="w-4 h-4 mb-1" /> One-time pot
        </button>
        <button
          type="button"
          onClick={() => persist({ ...plan, mode: 'recurring' })}
          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold ${
            plan.mode === 'recurring'
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-700'
              : 'border-slate-200 dark:border-slate-700 text-slate-600'
          }`}
        >
          <RefreshCw className="w-4 h-4 mb-1" /> Recurring
        </button>
      </div>

      {plan.mode === 'pot' ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-gradient-to-b from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-3xl font-black text-rose-600">{money(thisMonthTotal)}</p>
                <p className="text-xs text-rose-500/80">of {money(plan.goal || DEFAULT_GOAL)} this month</p>
              </div>
              <span className="text-4xl">🫙</span>
            </div>
            <Progress value={progressPct} className="h-3 mb-3" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <p className="font-black text-slate-700 dark:text-slate-200">{money(allTimeTotal)}</p>
                <p className="text-slate-400">All time</p>
              </div>
              <div>
                <p className="font-black text-slate-700 dark:text-slate-200">{plan.potEntries.length}</p>
                <p className="text-slate-400">Entries</p>
              </div>
              <div>
                <p className="font-black text-slate-700 dark:text-slate-200">{Object.keys(byContributor).length}</p>
                <p className="text-slate-400">Contributors</p>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Monthly goal</Label>
              <Input
                type="number"
                value={plan.goal}
                onChange={(e) => persist({ ...plan, goal: Number(e.target.value) || DEFAULT_GOAL })}
              />
            </div>
            <Button size="sm" onClick={() => setShowAdd((v) => !v)} className="bg-rose-500 hover:bg-rose-600 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>

          {showAdd && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-2">
              <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input placeholder="Cause / charity name" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} />
              <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex gap-2">
                <Button onClick={addToPot} disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to pot'}
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {plan.potEntries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" /> Recent pot entries
              </p>
              {plan.potEntries.slice(0, 8).map((e) => (
                <div key={e.id} className="flex justify-between text-xs rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
                  <span className="text-slate-600 dark:text-slate-300 truncate mr-2">
                    {e.date} · {e.cause}
                  </span>
                  <span className="font-bold text-rose-600">{money(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Recurring schedule is saved here for reminders and tracking. Automatic Stripe charging is coming soon with verified charity partners.
          </p>
          {plan.recurring?.status === 'active' && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm">
              <p className="font-bold text-emerald-800 dark:text-emerald-200">
                {money(plan.recurring.amount)} / {plan.recurring.interval === 'day' ? 'day' : 'week'}
              </p>
              <p className="text-xs text-emerald-700/80 mt-0.5">
                {plan.recurring.cause} · next due {plan.recurring.nextDue}
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={clearRecurring}>Clear plan</Button>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs">Amount</Label>
            <Input type="number" value={recurringForm.amount} onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })} />
            <Label className="text-xs">Cause</Label>
            <Input value={recurringForm.cause} onChange={(e) => setRecurringForm({ ...recurringForm, cause: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" variant={recurringForm.interval === 'day' ? 'default' : 'outline'} onClick={() => setRecurringForm({ ...recurringForm, interval: 'day' })}>Daily</Button>
              <Button size="sm" variant={recurringForm.interval === 'week' ? 'default' : 'outline'} onClick={() => setRecurringForm({ ...recurringForm, interval: 'week' })}>Weekly</Button>
            </div>
            <Button onClick={saveRecurring} className="w-full bg-rose-500 hover:bg-rose-600 text-white">Save recurring plan</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <p className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
          <Bell className="w-3.5 h-3.5" /> Reminders
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setReminder('zakat')}>
            <Calendar className="w-3.5 h-3.5 mr-1" /> Remind me to pay Zakat
          </Button>
          <Button size="sm" variant="outline" onClick={() => setReminder('recurring')}>
            <Bell className="w-3.5 h-3.5 mr-1" /> Remind me about recurring giving
          </Button>
        </div>
        {(plan.reminders || []).slice(0, 3).map((r) => (
          <p key={r.id} className="text-[11px] text-slate-500">{r.date} — {r.title}</p>
        ))}
      </div>
    </div>
  );
}

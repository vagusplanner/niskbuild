/**
 * FamilyPrayerGoals — shared family prayer goals with per-member progress tracking.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, CheckCircle2, Loader2, Sun } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { GA } from '@/lib/ga4';
import { LoadingRows, ErrorState, EmptyState } from '@/components/family/FamilyErrorState';
import { cn } from '@/lib/utils';

const PRAYERS = ['all', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export default function FamilyPrayerGoals({ group, user }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', prayer_name: 'all', target_days: 7 });
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['familyPrayerGoals', group.id],
    queryFn: () => base44.entities.FamilyPrayerGoal.filter({ family_group_id: group.id }),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.FamilyPrayerGoal.create({
      ...form,
      family_group_id: group.id,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addDays(new Date(), form.target_days), 'yyyy-MM-dd'),
      member_progress: {},
      status: 'active',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyPrayerGoals'] });
      GA.familyPrayerGoalCreated();
      toast.success('Goal created for your family!');
      setShowForm(false);
      setForm({ title: '', prayer_name: 'all', target_days: 7 });
    },
  });

  const logProgressMutation = useMutation({
    mutationFn: async (goal) => {
      const current = goal.member_progress || {};
      const myCount = (current[user.email] || 0) + 1;
      const updated = { ...current, [user.email]: myCount };
      const allDone = group.member_emails.every(e => (updated[e] || 0) >= goal.target_days);
      return base44.entities.FamilyPrayerGoal.update(goal.id, {
        member_progress: updated,
        status: allDone ? 'completed' : 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyPrayerGoals'] });
      GA.familyPrayerLogged();
      toast.success('Progress logged! بارك الله فيك');
    },
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Family Prayer Goals
        </h3>
        <Button size="sm" onClick={() => setShowForm(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1">
          <Plus className="w-3.5 h-3.5" /> New Goal
        </Button>
      </div>

      {isLoading ? <LoadingRows count={2} /> : isError ? <ErrorState onRetry={refetch} /> : activeGoals.length === 0 ? (
        <EmptyState icon={Target} title="No active prayer goals" subtitle="Create one for your family and track everyone's progress together." />
      ) : null}

      {activeGoals.map(goal => {
        const progress = goal.member_progress || {};
        const myCount = progress[user.email] || 0;
        const myPct = Math.min(100, Math.round((myCount / goal.target_days) * 100));
        const membersCompleted = group.member_emails.filter(e => (progress[e] || 0) >= goal.target_days).length;
        const totalPct = Math.round((membersCompleted / (group.member_emails?.length || 1)) * 100);

        return (
          <div key={goal.id} className="rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/10 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{goal.title}</p>
                <div className="flex gap-2 mt-1">
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] capitalize">{goal.prayer_name}</Badge>
                  <Badge className="bg-slate-100 text-slate-600 border-0 text-[10px]">{goal.target_days} days</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{membersCompleted}/{group.member_emails?.length || 0} done</p>
                <p className="text-lg font-black text-amber-600">{totalPct}%</p>
              </div>
            </div>

            {/* Per-member progress */}
            <div className="space-y-1.5">
              {(group.member_emails || []).map((email, i) => {
                const name = group.member_names?.[i] || email.split('@')[0];
                const count = progress[email] || 0;
                const pct = Math.min(100, Math.round((count / goal.target_days) * 100));
                return (
                  <div key={email} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-slate-500 truncate">{name}</div>
                    <div className="flex-1 h-2 bg-amber-100 dark:bg-amber-900/40 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 w-8 text-right">{count}/{goal.target_days}</span>
                    {pct >= 100 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {myCount < goal.target_days && (
              <Button size="sm" onClick={() => logProgressMutation.mutate(goal)}
                disabled={logProgressMutation.isPending}
                className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
                Log My Prayer Today ✓
              </Button>
            )}
          </div>
        );
      })}

      {completedGoals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Completed</p>
          {completedGoals.map(goal => (
            <div key={goal.id} className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{goal.title}</p>
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-0 text-[10px]">Done 🎉</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Create goal dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-amber-500" />New Family Prayer Goal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal Title</Label>
              <Input className="mt-1" placeholder="e.g. All pray Fajr this week"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prayer</Label>
                <Select value={form.prayer_name} onValueChange={v => setForm(f => ({ ...f, prayer_name: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRAYERS.map(p => <SelectItem key={p} value={p} className="capitalize">{p === 'all' ? 'All 5 Prayers' : p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Days Target</Label>
                <Input type="number" min={1} max={30} className="mt-1"
                  value={form.target_days} onChange={e => setForm(f => ({ ...f, target_days: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
/**
 * FamilyHajjPlanner — collaborative Hajj & Umrah planning for the family group.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Map, TrendingUp, Users, Edit2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GA } from '@/lib/ga4';

const STATUS_COLORS = {
  planning: 'bg-blue-100 text-blue-700',
  saving: 'bg-amber-100 text-amber-700',
  booked: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function FamilyHajjPlanner({ group, user }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    hajj_status: group.hajj_status || 'planning',
    hajj_target_year: group.hajj_target_year || '',
    hajj_budget_target: group.hajj_budget_target || '',
    hajj_budget_saved: group.hajj_budget_saved || 0,
    hajj_plan_notes: group.hajj_plan_notes || '',
  });
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.FamilyGroup.update(group.id, {
      hajj_status: form.hajj_status,
      hajj_target_year: form.hajj_target_year,
      hajj_budget_target: parseFloat(form.hajj_budget_target) || 0,
      hajj_budget_saved: parseFloat(form.hajj_budget_saved) || 0,
      hajj_plan_notes: form.hajj_plan_notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyGroup'] });
      GA.familyHajjPlanSaved();
      toast.success('Hajj plan updated!');
      setEditing(false);
    },
  });

  const isAdmin = group.admin_email === user.email;
  const budgetPct = form.hajj_budget_target > 0
    ? Math.min(100, Math.round((form.hajj_budget_saved / form.hajj_budget_target) * 100))
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Map className="w-4 h-4 text-rose-500" /> Family Hajj Planner
        </h3>
        {isAdmin && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1 border-rose-200 text-rose-700">
            <Edit2 className="w-3.5 h-3.5" /> Edit Plan
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="space-y-4">
          {/* Status + year */}
          <div className="flex flex-wrap gap-3">
            <Badge className={`${STATUS_COLORS[group.hajj_status || 'planning']} border-0 capitalize text-sm px-3 py-1`}>
              {group.hajj_status || 'Planning'}
            </Badge>
            {group.hajj_target_year && (
              <Badge className="bg-slate-100 text-slate-700 border-0 text-sm px-3 py-1">
                Target: {group.hajj_target_year}
              </Badge>
            )}
          </div>

          {/* Budget progress */}
          {group.hajj_budget_target > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  <p className="font-bold text-sm text-rose-900 dark:text-rose-100">Hajj Savings</p>
                </div>
                <p className="text-lg font-black text-rose-600 dark:text-rose-400">{budgetPct}%</p>
              </div>
              <Progress value={budgetPct} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-rose-600 dark:text-rose-400">
                <span>${(group.hajj_budget_saved || 0).toLocaleString()} saved</span>
                <span>${(group.hajj_budget_target || 0).toLocaleString()} target</span>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-500" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Pilgrims ({group.member_emails?.length || 0})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(group.member_names || []).map((name, i) => (
                <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {group.hajj_plan_notes && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">Plan Notes</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed whitespace-pre-line">{group.hajj_plan_notes}</p>
            </div>
          )}

          {!group.hajj_budget_target && !group.hajj_plan_notes && isAdmin && (
            <div className="text-center py-6 text-slate-400">
              <Map className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No Hajj plan yet. Click "Edit Plan" to start planning!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-rose-100 dark:border-rose-900/40 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.hajj_status} onValueChange={v => setForm(f => ({ ...f, hajj_status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="saving">Saving</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Year</Label>
              <Input className="mt-1" placeholder="e.g. 2027" value={form.hajj_target_year}
                onChange={e => setForm(f => ({ ...f, hajj_target_year: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget Target ($)</Label>
              <Input type="number" className="mt-1" placeholder="15000" value={form.hajj_budget_target}
                onChange={e => setForm(f => ({ ...f, hajj_budget_target: e.target.value }))} />
            </div>
            <div>
              <Label>Amount Saved ($)</Label>
              <Input type="number" className="mt-1" placeholder="0" value={form.hajj_budget_saved}
                onChange={e => setForm(f => ({ ...f, hajj_budget_saved: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Plan Notes</Label>
            <Textarea className="mt-1" rows={3} placeholder="Visa requirements, travel agents, departure airport..."
              value={form.hajj_plan_notes} onChange={e => setForm(f => ({ ...f, hajj_plan_notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />Save Plan</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
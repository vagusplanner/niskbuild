import React, { useState } from 'react';
import { SDK } from '@/lib/custom-sdk.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Flame, Trophy, Pause, Play, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TOTAL_VERSES } from './QURAN_DATA';

const GOAL_PRESETS = [
  { title: 'Complete Quran in 1 Year', goal_type: 'complete_quran', target_verses_per_day: 18, days: 365 },
  { title: 'Complete Quran in 6 Months', goal_type: 'complete_quran', target_verses_per_day: 35, days: 180 },
  { title: 'Complete Quran in Ramadan', goal_type: 'complete_quran', target_verses_per_day: 208, days: 30 },
  { title: 'Read 10 Verses Daily', goal_type: 'daily_verses', target_verses_per_day: 10, days: null },
  { title: 'Read 1 Juz Weekly', goal_type: 'custom', target_verses_per_day: 30, days: null },
];

export default function QuranGoalManager() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', goal_type: 'daily_verses', target_verses_per_day: 20,
    target_completion_date: '', reminder_enabled: true, reminder_time: '06:00'
  });
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['quranGoals'],
    queryFn: () => SDK.entities.QuranGoal.list('-created_date')
  });

  const { data: readings = [] } = useQuery({
    queryKey: ['quranReadings'],
    queryFn: () => SDK.entities.QuranReading.list('-date', 200)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => SDK.entities.QuranGoal.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quranGoals'] }); toast.success('Goal created!'); setShowForm(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => SDK.entities.QuranGoal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quranGoals'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => SDK.entities.QuranGoal.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quranGoals'] }); toast.success('Goal removed'); }
  });

  const applyPreset = (preset) => {
    const target = preset.days
      ? format(new Date(Date.now() + preset.days * 86400000), 'yyyy-MM-dd')
      : '';
    setForm({ ...form, title: preset.title, goal_type: preset.goal_type, target_verses_per_day: preset.target_verses_per_day, target_completion_date: target });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Enter a goal title');
    saveMutation.mutate({ ...form, status: 'active', streak: 0, best_streak: 0, total_verses_read: 0 });
  };

  const totalVersesRead = readings.reduce((sum, r) => sum + (r.verses_count || 0), 0);
  const todayVerses = readings.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).reduce((sum, r) => sum + (r.verses_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-700">Quran Goals</h3>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
          <Plus className="w-4 h-4" /> New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-10">
          <Target className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500 text-sm">No Quran goals set</p>
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="mt-3">Set a Goal</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const daysLeft = goal.target_completion_date
              ? differenceInDays(new Date(goal.target_completion_date), new Date())
              : null;
            const dailyProgress = goal.target_verses_per_day
              ? Math.min(100, (todayVerses / goal.target_verses_per_day) * 100)
              : 0;
            const overallPct = goal.goal_type === 'complete_quran'
              ? Math.min(100, Math.round((totalVersesRead / TOTAL_VERSES) * 100))
              : dailyProgress;

            return (
              <Card key={goal.id} className={cn("overflow-hidden", goal.status === 'active' ? 'border-emerald-200' : 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{goal.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                          {goal.status}
                        </Badge>
                        {goal.target_verses_per_day > 0 && (
                          <span className="text-xs text-slate-500">{goal.target_verses_per_day} verses/day</span>
                        )}
                        {daysLeft !== null && (
                          <span className={cn("text-xs", daysLeft < 7 ? 'text-red-500' : 'text-slate-400')}>
                            {daysLeft > 0 ? `${daysLeft}d left` : 'Overdue'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => updateMutation.mutate({ id: goal.id, data: { status: goal.status === 'active' ? 'paused' : 'active' } })}>
                        {goal.status === 'active' ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(goal.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={overallPct} className="h-2 flex-1" />
                    <span className="text-xs font-medium text-emerald-700 w-8 text-right">{overallPct}%</span>
                  </div>
                  {goal.streak > 0 && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {goal.streak} day streak
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Goal Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Quran Goal</DialogTitle>
          </DialogHeader>
          {/* Presets */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {GOAL_PRESETS.map(p => (
                <button key={p.title} onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 text-xs border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition-all">
                  {p.title}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Goal Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g., Complete Quran this year" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.goal_type} onValueChange={v => setForm({ ...form, goal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_verses">Daily Verses</SelectItem>
                    <SelectItem value="complete_quran">Complete Quran</SelectItem>
                    <SelectItem value="complete_surah">Complete Surah</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Verses/Day Target</Label>
                <Input type="number" min={1} value={form.target_verses_per_day}
                  onChange={e => setForm({ ...form, target_verses_per_day: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Target Completion Date (optional)</Label>
              <Input type="date" value={form.target_completion_date}
                onChange={e => setForm({ ...form, target_completion_date: e.target.value })} />
            </div>
            <div>
              <Label>Reminder Time</Label>
              <Input type="time" value={form.reminder_time}
                onChange={e => setForm({ ...form, reminder_time: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                {saveMutation.isPending ? 'Saving...' : 'Create Goal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Target, Trash2, CheckCircle2, TrendingUp, Moon, BookOpen, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

const GOAL_CATEGORIES = [
  { value: 'quran', label: '📖 Quran', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'prayer', label: '🕌 Prayer', color: 'bg-blue-100 text-blue-800' },
  { value: 'fasting', label: '🌙 Fasting', color: 'bg-purple-100 text-purple-800' },
  { value: 'dhikr', label: '📿 Dhikr', color: 'bg-amber-100 text-amber-800' },
  { value: 'charity', label: '🤲 Charity', color: 'bg-rose-100 text-rose-800' },
  { value: 'knowledge', label: '🎓 Knowledge', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'character', label: '✨ Character', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'other', label: '⭐ Other', color: 'bg-slate-100 text-slate-800' },
];

const GOAL_UNITS = ['times/day', 'pages/day', 'minutes/day', 'juz', 'rakaat', 'times/week', 'custom'];

const ICON_MAP = { quran: BookOpen, prayer: Moon, fasting: Moon, dhikr: Heart, charity: Heart, knowledge: BookOpen, character: Target, other: Target };

export default function SpiritualGoalsTracker() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'prayer', target: '', unit: 'times/day', current: 0, deadline: '', notes: '' });

  const { data: goals = [] } = useQuery({
    queryKey: ['spiritualGoals'],
    queryFn: () => base44.entities.Goal.filter({ category: 'spiritual' })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({ ...data, category: 'spiritual', status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spiritualGoals'] });
      setShowForm(false);
      setForm({ title: '', category: 'prayer', target: '', unit: 'times/day', current: 0, deadline: '', notes: '' });
      toast.success('Spiritual goal created');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spiritualGoals'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spiritualGoals'] });
      toast.success('Goal removed');
    }
  });

  const incrementProgress = (goal) => {
    const newCurrent = Math.min((goal.current_value || 0) + 1, goal.target_value || 100);
    updateMutation.mutate({ id: goal.id, data: { current_value: newCurrent, status: newCurrent >= (goal.target_value || 100) ? 'completed' : 'active' } });
    if (newCurrent >= (goal.target_value || 100)) {
      toast.success(`🎉 Goal "${goal.title}" completed! Alhamdulillah!`);
    }
  };

  const catInfo = (val) => GOAL_CATEGORIES.find(c => c.value === val) || GOAL_CATEGORIES[7];

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <Card className="bg-white/80 backdrop-blur border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Spiritual Goals
            </CardTitle>
            <CardDescription>Set and track your personal Islamic goals</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <h4 className="font-semibold text-emerald-900">New Spiritual Goal</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Goal Title</Label>
                    <Input
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Read 1 juz daily"
                      className="bg-white h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Select value={form.unit} onValueChange={v => setForm(p => ({ ...p, unit: v }))}>
                      <SelectTrigger className="h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GOAL_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target</Label>
                    <Input
                      type="number" min="1"
                      value={form.target}
                      onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                      placeholder="e.g., 30"
                      className="bg-white h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Deadline (optional)</Label>
                    <Input
                      type="date"
                      value={form.deadline}
                      onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                      className="bg-white h-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => createMutation.mutate({ title: form.title, description: form.notes, target_value: parseFloat(form.target) || 1, current_value: 0, subcategory: form.category, unit: form.unit, due_date: form.deadline || undefined })}
                    disabled={!form.title || createMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Create Goal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <p className="text-2xl font-bold text-emerald-700">{activeGoals.length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-2xl font-bold text-blue-700">{completedGoals.length}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-700">
                {goals.length ? Math.round(goals.reduce((s, g) => s + Math.min(((g.current_value || 0) / (g.target_value || 1)) * 100, 100), 0) / goals.length) : 0}%
              </p>
              <p className="text-xs text-slate-500">Avg Progress</p>
            </div>
          </div>
        )}

        {/* Active Goals */}
        {activeGoals.length === 0 && !showForm && (
          <div className="text-center py-10">
            <Target className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No spiritual goals yet</p>
            <p className="text-slate-400 text-xs mt-1">Set goals to track your spiritual growth</p>
          </div>
        )}

        <div className="space-y-3">
          {activeGoals.map(goal => {
            const cat = catInfo(goal.subcategory || 'other');
            const pct = Math.min(Math.round(((goal.current_value || 0) / (goal.target_value || 1)) * 100), 100);
            const Icon = ICON_MAP[goal.subcategory] || Target;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border border-slate-200 rounded-xl space-y-2 bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{goal.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${cat.color}`}>{cat.label}</Badge>
                        {goal.due_date && (
                          <span className="text-[10px] text-slate-400">Due {format(new Date(goal.due_date), 'MMM d')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => incrementProgress(goal)}>
                      <TrendingUp className="w-3 h-3 mr-1" />+1
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => deleteMutation.mutate(goal.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{goal.current_value || 0} / {goal.target_value || 1} {goal.unit || ''}</span>
                    <span className="font-medium text-emerald-600">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Completed */}
        {completedGoals.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Completed 🎉</p>
            <div className="space-y-2">
              {completedGoals.map(goal => (
                <div key={goal.id} className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-emerald-800 flex-1">{goal.title}</p>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-400" onClick={() => deleteMutation.mutate(goal.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}